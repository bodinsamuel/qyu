const Queue = require('./queue');

module.exports = class Runner {
  constructor({ rateLimit = 50, statsInterval = 300, loopInterval = 50 } = {}) {
    // Options
    this.rateLimit = rateLimit;
    this.statsInterval = statsInterval;
    this.loopInterval = loopInterval;

    // Create queue
    this.queue = new Queue();
    this.push = this.queue.push.bind(this.queue);

    // Tasks processing
    this.done = [];
    this.current = [];

    // Stats
    this.startedDate = new Date();
    this.lastLoopDate = null;
    this._stats = {
      done: 0,
      doneSinceLastPush: 0,
    };

    // event listeners
    this.listeners = [];

    // setInterval process
    this._process = null;
    this._processStats = null;

    this._state = 'stop';
  }

  set state(value) {
    if (value === 'stop' || value === 'pause') {
      clearInterval(this._process);
      clearInterval(this._processStats);
    }
    this._state = value;
  }
  get state() {
    return this._state;
  }

  // ************************************* PUBLIC API ************************//
  /**
   * Launch task processing
   * @return {Promise}
   */
  start() {
    // do not launch multiple loop
    if (this.state === 'play') {
      return Promise.resolve('already started');
    }

    this.state = 'play';

    // Send initial stats
    this._emit('stats', this.stats());

    // Because we need to send stats regurarly,
    //  it's easier to actually process task in a timeInterval
    //  it also avoid chaining task, we just check every time if we can process more or less every iteration
    this._process = setInterval(() => {
      this.lastLoopDate = new Date();

      // We calcul remaining processors available
      const remaining = this.rateLimit - this.current.length;

      // We iterate to fill all remaining processor
      // it help us reach easyliy rateLimit without trespassing
      for (var i = 0; i < remaining; i++) {
        const task = this.queue.shift();
        if (!task) {
          return;
        }

        this._exec(task);
      }
    }, this.loopInterval);

    // Stats sender
    this._processStats = setInterval(() => {
      const stats = this.stats();
      this._emit('stats', stats);

      // When we reach 0 task remaining
      // we send a final event and clear the process
      if (stats.remaining !== 0 || stats.current !== 0) {
        return;
      }

      this.state = 'pause';
      this._emit('drain');
    }, this.statsInterval);

    return Promise.resolve('started');
  }

  /**
   * Pause task processing
   * @return {Promise}
   */
  pause() {
    return new Promise((resolve) => {
      if (this.state !== 'play') {
        resolve();
        return;
      }

      this.state = 'pause';

      this.on(
        'drain',
        () => {
          resolve();
          return true;
        },
        { once: true }
      );
    });
  }

  /**
   * Wait for a task to finish
   * @param  {string} idToWatch Unique identifier given when you push()
   * @return {Promise}
   */
  wait(idToWatch) {
    return new Promise((resolve) => {
      // Simply register an event done and wait for the right id to be called
      const off = this.on(
        'done',
        (task) => {
          if (task.id !== idToWatch) {
            return false;
          }

          resolve(task.result);
          return true;
        },
        { once: true }
      );

      // ----
      // Because the task can already be done (thus will not trigger an event)
      // we also do a manual check here
      for (var i = 0; i < this.done.length; i++) {
        if (this.done[i].id !== idToWatch) {
          continue;
        }

        off(); // remove listener
        resolve(this.done[i].result);
        return;
      }
    });
  }

  /**
   * Listen internal event
   * @param  {string}   name
   * @param  {Function} callback
   * @param  {object}   options
   * @return {Function}
   */
  on(name, callback, { once = false } = {}) {
    // -- Options
    // once: the callback need to return true/false to self destruct
    this.listeners.push({
      name,
      callback,
      options: { once },
    });

    return () => {
      this.off(name, callback);
    };
  }

  /**
   * Unlisten internal event
   * @param  {string}   name     name of the event
   * @param  {Function} callback callback that was passed on register
   */
  off(name, callback) {
    const index = this.listeners.findIndex((listener) => {
      return listener.name === name && listener.callback === callback;
    });

    if (index === -1) {
      return false;
    }

    this.listeners.splice(index, 1);
    return true;
  }

  /**
   * Get stats
   * @return {object}
   */
  stats() {
    let nbJobsPerSecond = 0;
    const execTimes = [];

    // Last second
    const before = new Date() - 1000;

    // Use reverse for, to filter by last pushed item
    //  + allow us to early return instead of listing all items
    for (var i = this.done.length - 1; i >= 0; i--) {
      if (before > this.done[i].doneDate) {
        break;
      }
      execTimes.push(this.done[i].doneDate - this.done[i].startDate);
      nbJobsPerSecond += 1;
    }

    const doneSinceLastPush = this._stats.doneSinceLastPush;

    // reset stats
    this._stats.doneSinceLastPush = 0;

    return {
      nbJobsPerSecond,
      doneSinceLastPush,
      done: this._stats.done,
      current: this.current.length,
      remaining: this.queue.length(),
      averageExecTime:
        execTimes.length > 0
          ? Math.round(execTimes.reduce((current, time) => current + time, 0) / execTimes.length)
          : 0,
    };
  }

  // ************************************ Private api *****
  /**
   * Execute a task
   * @param  {object} task
   */
  async _exec(task) {
    this.current.push(task);

    try {
      task.retry += 1;
      task.error = false;

      task.startDate = new Date();
      task.result = await task.callback();
      task.doneDate = new Date();
      this.done.push(task);
      this._stats.done += 1;
      this._stats.doneSinceLastPush += 1;

      this._emit('done', task);
    } catch (e) {
      // At this point we could have a retry
      task.error = e;
      this._emit('error', task);
    }

    // Remove from the current wether done or not
    this.current = this.current.filter((item) => {
      return item.id !== task.id;
    });
  }

  /**
   * Emit an evvent
   * @param  {string} name
   * @param  {object} data
   */
  _emit(name, data) {
    this.listeners.forEach(async (listener) => {
      if (listener.name !== name) {
        return;
      }

      const result = await listener.callback(data);
      if (listener.options.once === true && result === true) {
        this.off(name, listener.callback);
      }
    });
  }
};

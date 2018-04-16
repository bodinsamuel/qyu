const Queue = require('./queue');

module.exports = class Runner {
  constructor({ rateLimit = 50, statsInterval = 300, loopInterval = 16 } = {}) {
    this.state = 'stop';

    this.rateLimit = rateLimit;
    this.statsInterval = statsInterval;
    this.loopInterval = loopInterval; // 1 FPS

    // Create queue
    this.queue = new Queue();
    this.push = this.queue.push.bind(this.queue);

    this.startedDate = new Date();
    this.lastLoopDate = null;

    this._stats = {
      done: 0,
      doneSinceLastPush: 0,
    };

    this.done = [];
    this.current = [];

    this.listeners = [];

    this._process = null;
    this._processStats = null;
  }

  set state(value) {
    if (value === 'stop' || value === 'pause') {
      clearInterval(this.process);
    }
  }

  // ************************************* PUBLIC api *****
  /**
   * Launch task processing
   * @return {Promise}
   */
  start() {
    // do not launch multiple loop
    if (this.state === 'play') {
      return Promise.resolve();
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
        this.current.push(task.id);

        if (!task) {
          return;
        }

        this._exec(task);
      }
    }, this.loopInterval);

    this._processStats = setInterval(() => {
      const stats = this.stats();
      this._emit('stats', stats);

      if (stats.remaining === 0) {
        this.state = 'pause';
        this._emit('drain');
        clearInterval(this.statsInterval);
      }
    }, this.statsInterval);

    return Promise.resolve();
  }

  /**
   * Pause task processing
   * @return {Promise}
   */
  pause() {
    return Promise.resolve();
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
   * @return {Function}
   */
  on(name, callback, { once = false } = {}) {
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

    if (index === false) {
      return;
    }

    this.listeners.splice(index, 1);
  }

  /**
   * Get stats
   * @return {object}
   */
  stats() {
    let nbJobsPerSecond = 0;

    // Last second
    const before = new Date() - 1000;

    // Use reverse for, to filter last pushed item
    //  + allow us to early return instead of listing all items
    for (var i = this.done.length - 1; i >= 0; i--) {
      if (before > this.done[i]) {
        break;
      }

      nbJobsPerSecond += 1;
    }

    const doneSinceLastPush = this._stats.doneSinceLastPush;
    this._stats.doneSinceLastPush = 0;
    return {
      nbJobsPerSecond,
      doneSinceLastPush,
      done: this._stats.done,
      remaining: this.queue.length(),
    };
  }

  // ************************************ Private api *****
  /**
   * Execute a task
   * @param  {object} task
   */
  async _exec(task) {
    try {
      task.retry += 1;
      task.error = false;

      task.result = await task.callback();
      task.done = new Date();
      this.done.push(task);
      this._stats.done += 1;
      this._stats.doneSinceLastPush += 1;

      this._emit('done', task);
    } catch (e) {
      // at this point we could have a retry
      task.error = e;
      this._emit('error', task);
    }

    // Remove from the current wether done or not
    this.current = this.current.splice(this.current.indexOf(task.id), 1);
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

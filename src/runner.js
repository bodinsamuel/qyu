const Queue = require('./queue');

module.exports = class Runner {
  constructor({ rateLimit = 50, statsInterval = 300 } = {}) {
    this.state = 'stop';

    this.rateLimit = rateLimit;
    this.statsInterval = statsInterval;

    // Create queue
    this.queue = new Queue();
    this.push = this.queue.push.bind(this.queue);

    this.listeners = [];
    this.done = [];
  }

  // ************************************* PUBLIC api *****
  /**
   * Launch task processing
   * @return {Promise}
   */
  start() {
    const task = this.queue.shift();
    if (!task) {
      this._trigger('drain');
    } else {
      this._exec(task);
    }

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
    this.listeners = this.listeners.splice(0, index);
  }

  // ************************************ Private api *****
  async _exec(task) {
    try {
      task.retry += 1;
      task.error = false;

      task.result = await task.callback();
      task.done = new Date();
      this.done.push(task);

      this._trigger('done', task);
    } catch (e) {
      // at this point we could have a retry
      task.error = e;
      this._trigger('error', task);
    }

    // loop again
    this.start();
  }

  _trigger(name, data) {
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

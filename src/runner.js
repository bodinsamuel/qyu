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
   * @param  {string} id Unique identifier given when you push()
   * @return {Promise}
   */
  wait() {}

  /**
   * Listen internal event
   * @param  {string}   name
   * @param  {Function} callback
   * @return {Function}
   */
  on(name, callback) {
    this.listeners.push({ name, callback });
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
    this.listeners = this.listeners.splice(0, index);
  }

  // ************************************ Private api *****
  async _exec(task) {
    try {
      task.retry += 1;
      task.error = false;

      task.result = await task.callback();
      task.done = true;
      this.done.push(task);

      this._trigger('done', task);
    } catch (e) {
      // at this point we could have a retry
      task.error = e;
      this._trigger('error', task);
    }
  }

  _trigger(name, data) {
    this.listeners.forEach((listener) => {
      if (listener.name !== name) {
        return;
      }

      listener.callback(data);
    });
  }
};

module.exports = class Qyu {
  constructor({ rateLimit = 50, statsInterval = 300 }) {
    this.state = 'stop';

    this.rateLimit = rateLimit;
    this.statsInterval = statsInterval;
    this.queue = [];
    this.current = [];

    this.listener = [];
  }

  // ************************************* PUBLIC api *****
  push([job, priority]) {
    this.queue.push({
      job,
      priority,
    });
  }

  start() {}

  pause() {}

  wait() {}

  on(name, callback) {
    this.listener.push({ uid: this._getUID(), name, callback });
  }

  off() {}

  // ************************************ Private api *****
  _getUID() {}
  _trigger() {}
  _next() {}
};

export default class Qyu {
  constructor({ rateLimit = 50, statsInterval = 300 }) {
    this.rateLimit = rateLimit;
    this.statsInterval = statsInterval;
    this.queue = [];
    this.current = [];

    this.listener = [];
  }

  trigger() {

  }

  on(name, callback) {
    this.listener.push({ name, callback });
  }

  off() {
  }

  push([]) {

  }
}

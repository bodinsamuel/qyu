module.exports = class Queue {
  constructor({ maxPriority = 10 } = {}) {
    this.maxPriority = maxPriority;

    this.buckets = {};
    this.pushed = 0;

    // Create initial bucket with X entries
    for (var i = 1; i <= this.maxPriority; i++) {
      this.buckets[i] = [];
    }
  }

  destroy() {
    this.buckets = null;
  }

  get length() {
    return this._length();
  }

  /**
   * Push a new task in the queue
   * @param  {Function} callback
   * @param  {Number}   priority Between 1-10
   * @return {string}            Unique identifier
   */
  push(callback, priority = 5) {
    if (typeof callback !== 'function') {
      throw new Error('callback should a function');
    }

    // constrain priority
    priority = Math.min(this.maxPriority, Math.max(1, priority));

    const id = this._getUID();
    this.buckets[priority].push({
      id,
      callback,
      priority,
      retry: 0,
      error: false,
      done: false,
    });
    this.pushed += 1;

    return id;
  }

  /**
   * Get next task in queue, by priority
   * @return {object}
   */
  shift() {
    // For object.keys has the fastest iteration in node
    for (var i = 0, keys = Object.keys(this.buckets); i < keys.length; i++) {
      if (this.buckets[keys[i]].length <= 0) {
        continue;
      }

      return this.buckets[keys[i]].shift();
    }

    return false;
  }

  /**
   * Get length of the queue
   * @return {integer}
   */
  _length() {
    let len = 0;
    // because of the "buckets system" we need to iterate and add length
    for (var i = 0, keys = Object.keys(this.buckets); i < keys.length; i++) {
      len += this.buckets[keys[i]].length;
    }
    return len;
  }

  /**
   * Get a "unique" id (not really unique but suffisant for small usage)
   * @return {string}
   */
  _getUID() {
    return (Math.random() + 1).toString(36).substr(0, 7);
  }
};

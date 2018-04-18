!(function(t, e) {
  'object' == typeof exports && 'undefined' != typeof module
    ? (module.exports = e())
    : 'function' == typeof define && define.amd
      ? define(e)
      : (t.Qyu = e());
})(this, function() {
  'use strict';
  var t = class {
      constructor({ maxPriority: t = 10 } = {}) {
        (this.maxPriority = t), (this.buckets = {}), (this.pushed = 0), this.init();
      }
      destroy() {
        this.buckets = null;
      }
      get length() {
        return this._length();
      }
      init() {
        this.pushed = 0;
        for (var t = 1; t <= this.maxPriority; t++) this.buckets[t] = [];
      }
      push(t, e = 5) {
        if ('function' != typeof t) throw new Error('callback should a function');
        e = Math.min(this.maxPriority, Math.max(1, e));
        const s = this._getUID();
        return (
          this.buckets[e].push({ id: s, callback: t, priority: e, retry: 0, error: !1, done: !1 }),
          (this.pushed += 1),
          s
        );
      }
      shift() {
        for (var t = 0, e = Object.keys(this.buckets); t < e.length; t++)
          if (!(this.buckets[e[t]].length <= 0)) return this.buckets[e[t]].shift();
        return !1;
      }
      _length() {
        let t = 0;
        for (var e = 0, s = Object.keys(this.buckets); e < s.length; e++)
          t += this.buckets[s[e]].length;
        return t;
      }
      _getUID() {
        return (Math.random() + 1).toString(36).substr(0, 7);
      }
    },
    e = Object.freeze({ default: t, __moduleExports: t }),
    s = (e && t) || e,
    i = class {
      constructor({ rateLimit: t = 50, statsInterval: e = 300, loopInterval: i = 50 } = {}) {
        (this.rateLimit = t),
          (this.statsInterval = e),
          (this.loopInterval = i),
          (this.queue = new s()),
          (this.push = this.queue.push.bind(this.queue)),
          (this.done = []),
          (this.current = []),
          (this.startedDate = new Date()),
          (this.lastLoopDate = null),
          (this._stats = { done: 0, doneSinceLastPush: 0 }),
          (this.listeners = []),
          (this._process = null),
          (this._processStats = null),
          (this._state = 'stop');
      }
      destroy() {
        (this.state = 'stop'),
          this.queue.destroy(),
          (this.queue = []),
          (this.push = null),
          (this.current = []),
          (this.done = []),
          (this.listeners = []),
          (this._process = null),
          (this._processStats = null);
      }
      set state(t) {
        ('stop' !== t && 'pause' !== t) || clearInterval(this._process),
          'stop' === t && clearInterval(this._processStats),
          (this._state = t);
      }
      get state() {
        return this._state;
      }
      start() {
        return 'play' === this.state
          ? Promise.resolve('already started')
          : ((this.state = 'play'),
            this._emit('stats', this.stats()),
            this._loop(),
            (this._process = setInterval(() => {
              this._loop();
            }, this.loopInterval)),
            (this._processStats = setInterval(() => {
              const t = this.stats();
              this._emit('stats', t),
                ((0 === t.remaining && 0 === t.current) || 'play' !== this.state) &&
                  ('play' === this.state && (this.state = 'pause'),
                  (0 !== t.remaining && 'pause' !== this.state) ||
                    (this._emit('drain'), clearInterval(this._processStats)));
            }, this.statsInterval)),
            Promise.resolve('started'));
      }
      pause() {
        return new Promise((t) => {
          'play' === this.state
            ? ((this.state = 'pause'), this.on('drain', () => (t(!0), !0), { once: !0 }))
            : t(!0);
        });
      }
      wait(t) {
        return new Promise((e) => {
          const s = this.on('done', (s) => s.id === t && (e(s.result), !0), { once: !0 });
          for (var i = 0; i < this.done.length; i++)
            if (this.done[i].id === t) return s(), void e(this.done[i].result);
        });
      }
      on(t, e, { once: s = !1 } = {}) {
        return (
          this.listeners.push({ name: t, callback: e, options: { once: s } }),
          () => {
            this.off(t, e);
          }
        );
      }
      off(t, e) {
        const s = this.listeners.findIndex((s) => s.name === t && s.callback === e);
        return -1 !== s && (this.listeners.splice(s, 1), !0);
      }
      stats() {
        let t = 0;
        const e = [],
          s = new Date() - 1e3;
        for (var i = this.done.length - 1; i >= 0 && !(s > this.done[i].doneDate); i--)
          e.push(this.done[i].doneDate - this.done[i].startDate), (t += 1);
        const r = this._stats.doneSinceLastPush;
        this._stats.doneSinceLastPush = 0;
        const n = e.length > 0 ? Math.round(e.reduce((t, e) => t + e, 0) / e.length) : 0;
        return {
          nbJobsPerSecond: t,
          doneSinceLastPush: r,
          done: this._stats.done,
          current: this.current.length,
          remaining: this.queue.length,
          averageExecTime: n,
        };
      }
      clear() {
        (this.current = []), (this.done = []), this.queue.init();
      }
      _loop() {
        this.lastLoopDate = new Date();
        const t = this.rateLimit - this.current.length;
        for (var e = 0; e < t; e++) {
          const t = this.queue.shift();
          if (!t) return;
          this._exec(t);
        }
      }
      async _exec(t) {
        this.current.push(t);
        try {
          (t.retry += 1),
            (t.error = !1),
            (t.startDate = new Date()),
            (t.result = await t.callback()),
            (t.doneDate = new Date()),
            this.done.push(t),
            (this._stats.done += 1),
            (this._stats.doneSinceLastPush += 1),
            this._emit('done', t);
        } catch (e) {
          (t.error = e), this._emit('error', t);
        }
        this.current = this.current.filter((e) => e.id !== t.id);
      }
      _emit(t, e) {
        this.listeners.forEach(async (s) => {
          if (s.name !== t) return;
          const i = await s.callback(e);
          !0 === s.options.once && !0 === i && this.off(t, s.callback);
        });
      }
    },
    r = Object.freeze({ default: i, __moduleExports: i }),
    n = (r && i) || r;
  return (t) => new n(t);
});

const Runner = require('./../src/Runner');

test('should create a new instance correctly', () => {
  const instance = new Runner();
  expect(instance).toBeInstanceOf(Runner);
});

test('should have correct default params without constructor args', () => {
  const instance = new Runner();
  expect(instance.rateLimit).toEqual(50);
  expect(instance.statsInterval).toEqual(300);
});

test('should have correct params when passed', () => {
  const instance = new Runner({
    rateLimit: 100,
  });
  expect(instance.rateLimit).toEqual(100);
  expect(instance.statsInterval).toEqual(300);
});

describe('push()', () => {
  let q;
  beforeEach(() => {
    q = new Runner();
  });

  test('should register job correctly', () => {
    expect(q.queue.length()).toEqual(0);

    const job = () => true;
    const id = q.push(job, 1);
    expect(id).toMatch(/[a-z0-9]{0,7}/g);
    expect(q.queue.length()).toEqual(1);
  });
});

describe('on()', () => {
  test('should register a listener correctly', () => {
    const q = new Runner();
    expect(q.listeners).toHaveLength(0);

    const cb = () => true;
    q.on('done', cb);
    expect(q.listeners).toHaveLength(1);
  });

  test('should receive event on done', (done) => {
    const q = new Runner();
    const idOriginal = q.push(() => true, 10);

    q.on('done', ({ id }) => {
      expect(id).toEqual(idOriginal);
      done();
    });
    q.start();
  });

  test('should receive event on error', (done) => {
    const q = new Runner();
    q.on('error', ({ error }) => {
      expect(error.message).toEqual('foobar');
      done();
    });
    q.push(() => {
      throw new Error('foobar');
    }, 10);
    q.start();
  });

  test('should receive event on drain', (done) => {
    const q = new Runner();
    q.on('drain', () => {
      done();
    });
    q.start();
  });

  test('should register a once listener correctly', (done) => {
    const q = new Runner();
    expect(q.listeners).toHaveLength(0);

    q.on('drain', () => {
      // because everything is async,
      // drain is actually called before we had the chance to remove the once listener
      // So just wait a few ms just to be sure
      setTimeout(() => {
        expect(q.listeners).toHaveLength(1);
        done();
      }, 20);
    });

    q.on('done', () => true, { once: true });
    expect(q.listeners).toHaveLength(2);

    q.push(() => true, 1);
    q.start();
  });
});

describe('off()', () => {
  test('should unlisten correctly', () => {
    const q = new Runner();
    const cb = () => true;
    q.on('done', cb);
    expect(q.listeners).toHaveLength(1);

    q.off('done', cb);
    expect(q.listeners).toHaveLength(0);
  });

  test('should unlisten correctly with returned callback', () => {
    const q = new Runner();
    const cb = () => true;
    const off = q.on('done', cb);
    expect(q.listeners).toHaveLength(1);

    off();
    expect(q.listeners).toHaveLength(0);
  });

  test('should return false on unknown listener', () => {
    const q = new Runner();
    const off = q.off('done', () => true);
    expect(off).toEqual(false);
  });
});

describe('start()', () => {
  test('should return a promise', () => {
    const q = new Runner();
    const p = q.start();
    expect(p).toBeInstanceOf(Promise);
  });

  test('should return already started', async () => {
    const q = new Runner();
    q.start();
    const p2 = await q.start();
    expect(p2).toEqual('already started');
  });
});

describe('pause()', () => {
  test('should return a promise', () => {
    const q = new Runner();
    const p = q.pause();
    expect(p).toBeInstanceOf(Promise);
  });

  test('should return a pause after all task are being processed', async () => {
    const q = new Runner();
    let hasPassed = false;
    q.push(async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          hasPassed = true;
          resolve();
        }, 100);
      });
    }, 1);
    q.start();

    await q.pause();
    expect(hasPassed).toEqual(true);
  });
});

describe('wait()', () => {
  test('should return a promise', () => {
    const q = new Runner();
    const p = q.wait();
    expect(p).toBeInstanceOf(Promise);
  });

  test('should be called after a task was exec', (done) => {
    const q = new Runner();
    const id = q.push(() => true, 1);
    q.wait(id).then((result) => {
      expect(result).toEqual(true);

      // because it was an event we need to be sure it was registered and removed
      expect(q.listeners).toHaveLength(1);
      setTimeout(() => {
        expect(q.listeners).toHaveLength(0);
        done();
      }, 20);
    });

    q.start();
  });

  test('should be called after a task was exec, already done', (done) => {
    const q = new Runner();
    const id = q.push(() => true, 1);
    q.start();

    setTimeout(() => {
      q.wait(id).then((result) => {
        expect(q.listeners).toHaveLength(0);
        expect(result).toEqual(true);
        done();
      });
    }, 130);
  });
});

describe('stats()', () => {
  test('should return a valid object', () => {
    const q = new Runner();
    const stats = q.stats();
    expect(stats).toMatchObject({
      nbJobsPerSecond: 0,
      doneSinceLastPush: 0,
      done: 0,
      remaining: 0,
    });
  });

  test('should send stats event', (done) => {
    const q = new Runner();
    for (var i = 0; i < 10; i++) {
      q.push(async () => {
        return new Promise((resolve) => {
          setTimeout(resolve, 35);
        });
      }, 1);
    }

    let incr = 0;
    q.on('stats', (stats) => {
      if (incr === 0) {
        expect(stats).toMatchObject({
          nbJobsPerSecond: 0,
          doneSinceLastPush: 0,
          done: 0,
          remaining: 10,
        });
      } else if (incr === 1) {
        expect(stats).toMatchObject({
          nbJobsPerSecond: 10,
          doneSinceLastPush: 10,
          done: 10,
          remaining: 0,
        });
      } else if (incr === 2) {
        expect(stats).toMatchObject({
          nbJobsPerSecond: 10,
          doneSinceLastPush: 0,
          done: 10,
          remaining: 0,
        });
        done();
      }

      incr += 1;
    });
    q.start();
  });

  test('should return 0 when waiting longer than statsInterval', (done) => {
    const q = new Runner();
    q.push(() => true, 1);
    q.start();

    setTimeout(() => {
      const stats = q.stats();
      expect(stats).toMatchObject({
        nbJobsPerSecond: 0,
        doneSinceLastPush: 0,
        done: 1,
        remaining: 0,
      });
      done();
    }, 2000);
  });
});

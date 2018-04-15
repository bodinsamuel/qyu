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
      }, 10);
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
});

describe('start()', () => {
  let q;
  beforeEach(() => {
    q = new Runner();
  });

  test('should return a promise', () => {
    const p = q.start();
    expect(p).toBeInstanceOf(Promise);
  });
});

describe('pause()', () => {
  let q;
  beforeEach(() => {
    q = new Runner();
  });

  test('should return a promise', () => {
    const p = q.pause();
    expect(p).toBeInstanceOf(Promise);
  });
});

describe('wait()', () => {
  let q;
  beforeEach(() => {
    q = new Runner();
  });

  test('should return a promise', () => {
    const p = q.wait();
    expect(p).toBeInstanceOf(Promise);
  });

  test('should be called after a task was exec', (done) => {
    const id = q.push(() => true, 1);
    q.wait(id).then((result) => {
      expect(result).toEqual(true);

      // because it was an event we need to be sure it was registered and removed
      expect(q.listeners).toHaveLength(1);
      setTimeout(() => {
        expect(q.listeners).toHaveLength(0);
        done();
      }, 5);
    });

    q.start();
  });

  test('should be called after a task was exec, already done', (done) => {
    const id = q.push(() => true, 1);
    q.start();

    setTimeout(() => {
      q.wait(id).then((result) => {
        expect(q.listeners).toHaveLength(0);
        expect(result).toEqual(true);
        done();
      });
    }, 10);
  });
});

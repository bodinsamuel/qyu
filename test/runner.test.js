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

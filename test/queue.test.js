const Queue = require('./../src/queue');

describe('new()', () => {
  let q;
  beforeEach(() => {
    q = new Queue();
  });

  test('should should initiate buckets correctly', () => {
    expect(q.buckets).toMatchObject({
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
    });
  });
});

describe('push()', () => {
  let q;
  beforeEach(() => {
    q = new Queue();
  });

  test('should push a task in queue correctly', () => {
    expect(q.length()).toEqual(0);

    const job = () => true;
    const id = q.push(job, 3);
    expect(q.buckets).toMatchObject({
      1: [],
      2: [],
      3: [{}],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
      10: [],
    });
    expect(q.length()).toEqual(1);
    expect(q.buckets[3][0]).toMatchObject({
      id,
      priority: 3,
      callback: job,
      error: false,
      retry: 0,
      done: false,
    });
  });
});

describe('_getUID()', () => {
  let q;
  beforeEach(() => {
    q = new Queue();
  });

  let id;
  test('should return an unique identifier', () => {
    id = q._getUID();
    expect(id).toMatch(/[a-z0-9]{0,7}/g);
  });

  test('should return an unique identifier that does not match the one before', () => {
    const id2 = q._getUID();
    expect(id2).not.toEqual(id);
  });
});

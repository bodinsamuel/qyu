const Qyu = require('./../src/qyu');

let instance;

test('should create a new instance correctly', () => {
  instance = new Qyu();
  expect(instance).toBeInstanceOf(Qyu);
});

test('should have correct default params without constructor args', () => {
  instance = new Qyu();
  expect(instance.rateLimit).toEqual(50);
  expect(instance.statsInterval).toEqual(300);
});

test('should have correct params when passed', () => {
  instance = new Qyu({
    rateLimit: 100,
  });
  expect(instance.rateLimit).toEqual(100);
  expect(instance.statsInterval).toEqual(300);
});

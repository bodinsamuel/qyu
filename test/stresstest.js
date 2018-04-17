const qyu = require('./../');

// *****
// this is a basic stress test
// It will process 100K jobs that run in 100ms each
// with the current qyu() configuration, it should take about ~20s
const jobs = 100000;
const run = 100;
const processor = 1000;
const loop = 50;

let start;
let end;

const q = qyu({
  rateLimit: processor,
  statsInterval: 100,
  loopInterval: loop,
});

q.on('drain', () => {
  end = new Date();
  console.log('No more jobs to do', end);
  console.log('Running time', (end - start) / 1000);

  const stats = q.stats();
  if (stats.done !== jobs) {
    throw new Error('all jobs were not executed');
  }
});

q.on('stats', (stats) => {
  console.log(`${stats.nbJobsPerSecond} jobs/s processed, avg execTime ${stats.averageExecTime}ms`);
});

q.on('error', ({ error }) => {
  console.error(`error ${error.message}`);
});

(async () => {
  for (var i = 0; i < jobs; i++) {
    q.push(job, 1);
  }
  await q.start();
  start = new Date();
  setTimeout(() => {
    // q.destroy();
  }, 2000);
  console.log('start', start);
})();

// example job:
async function job() {
  await wait(run);
  return { Hello: 'world!' }; // That's the job `result`
}

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}


# qyu
```javascript
import Qyu from 'qyu';

const q = Qyu();
q.push(() => mySuperLongJob);
q.start();
```

# Commands
```bash
# run test
npm run test

# run test with coverage (should be 100%)
npm run coverage

# run exercice (initial test given by algolia)
node ./test/exercice.js

# run stress test (100k task in 20s)
node ./test/stresstest.js
```

## API
### Configuration
```javascript
Qyu({
    rateLimit: 50
    statsInterval: 300
    loopInterval: 16
});
```

#### Ratelimit
> Define the maximum number of concurrent job it can process

*Default:* 50
`Qyu({ rateLimit: 200 });`

#### statsInterval
> Define the interval in ms in which you will receive stats

*Default:* 300
`Qyu({ statsInterval: 1000 });`

#### loopInterval
> Define the interval in ms in which job are automatically processed

*Default:* 100
`Qyu({ loopInterval: 200 });`

### Methods
#### push(`job<function>`, `priority<number>`):number
> Push a task in the queue

*Priority:* [1, 10] bigger the number, lesser is the priority (default: 5)
```javascript
const id = q.push(() => console.log('myjob'), 1);
```
#### start():Promise
> Start the processing of task

#### pause():Promise
> Pause the processing of task

#### wait(`taskId<number>`):Promise
> Respond when a task `<id>` has been processed

#### stats():Object
> Respond with current stats instantly

#### on(`name<string>`, `callback<function>`, `options<object>`):Function
> Add an event listener, return a function to unlisten
```javascript
const listener = q.on('done', () => console.log('received'));
listener(); // alias for off('done', <thecallback>);
```

#### off(`name<string>`, `callback<function>`):Object
> Remove an event listener
```javascript
q.off('done', () => console.log('received'));
```


### Events
#### done
> Sent when a task was successfully executed
```javascript
q.on('done', ({ id, result }) => console.log(id, results));
```

#### error
> Sent when a task triggered an error
```javascript
q.on('error', ({ id, error }) => console.log(id, error));
```
#### drain
> Sent when all task are fully executed
```javascript
q.on('drain', () => console.log('drained'));
```
#### stats
> Sent every X ms with global stats and timing stats
```javascript
q.on('stats', (stats) => console.log({ stats }));
```

# Implementation

The implementation was thought with this in mind:

- It has to handle probably thousands of tasks
- tasks will be prioritized
- tasks will probably be between 10ms to +3seconds
- task can fail but it has to be clear about that
- it has to be very light and simple


## runner.js
The Runner is the actual task (job) processor. It handle the stats, the processing, the events and so on.
It take tasks, and process them in an interval (`loopInterval`).
#### Why the interval ?
The interval help us optimizing the rateLimit. A "naive" implementation would be to launch 50 tasks and that theses task call an other processing.
It's quiet easy but it's also very error prone, if you don't handle process well (with error or so) you can easily end with no remaining processor alive.

The interval help us checking very regurarly if processors are available. If tasks are executed quicker than our interval then processing power is "lost", but it's most likely that the interval will check more often than what is available. It also keep the call stack very light, as we do not do recursive task processing, as done in naive method.

The second interval for stats is here to ensure we send stats exactly every `statsInterval` and also to send initial and final stats.


## Queue.js
The Queue is the "storage" of the tasks. I assumed the task will be prioritized by number and that range can be changed.

#### Buckets ?
Instead of having a big fat Array of tasks, I'v decided to implements a light buckets system. The keys are the range of priority (from 1 to 10) and task are pushed in the right buckets when they are initially pushed in the queue.
I choose that system, because if we handle thousand of task it can be very CPU consuming to iterate the whole queue when we need an item.
We could have done sort-on-push but it will need to rewrite the whole array every time we push.
We could have done sort-on-shift but its probably the worst solution (specially if tasks are very quick).

This solution make the `shift()` call very predictible, it will execute max 10 iterations, and pick one task without rewriting the whole array. It's very lightweight and quiet simple.
The only downside to this (because it was more fitting to this exercice) the strategy is almost hardcoded, but it can be easily improved but splitting code more or letting user override push/shift (i.e: if we want to change strategy from prioritized to alpha).



## Technology
This library use
- `prettier` + `eslint` for the syntax check/formatting, it really help to have a standard and automatic formatting (on pre-commit)
- `jest` for the unit test and coverage, the api is clear and the cli is quiet powerful without overhead
- `rollupjs` for packaging this lib into a single file to be used in browser. Rollup is way easier to use than webpack and have many advantages.

This library does not use (but could be)
- a better unique id generator
- node.js Events emitter or a library (I actually implemented my own solution to have specific pseudo "once()" but it act mostly like the native one)
- a CLI lib to better handle node.js execution (--help, command parsing, interactive display..)


## Improvements
- Automatic Retry/Unshift on error
- Automatic start on first push
- if it's in node: We could easily improve the script by entirely splitting the queue and the runner, to have a master queue and multiple runner in multiple node process. With websockets communication and message ack, but at this point, maybe a battle-tested tools would be more suited.
- if it's in browser: we could use WebWorkers to do the same thing


# qyu
```javascript
import Qyu from 'qyu';

const q = Qyu();
q.push(() => mySuperLongJob);
q.start();
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


### Events
Multiple events are sent, you can subscribe like this:
```javascript
q.on('done', () => console.log('received'));
```
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

- It has to handle thousand of tasks
- tasks will probably be between 10ms to +3seconds
- task can fail but it has to be clear about that
- it has to be very light and simple


## runner.js
The Runner is the actual task (job) processor. It handle the stats, the processing, the events and so on.


## Queue.js
The Queue is the "storage" of the tasks.

-

## Technology
This library use
- `prettier` + `eslint` for the syntax check/formatting, it really help to have a standard and automatic formatting (on pre-commit)
- `jest` for the unit test, the api is clear and the cli is quiet powerful without overhead

## Improvements
We could easily improve the script by entirely splitting the queue and the runner, to have a master queue and multiple runner in multiple node process. With websockets communication and message ack, but at this point, maybe a battle tested tools would be more suited.

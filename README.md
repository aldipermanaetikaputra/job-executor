# job-executor

A flexible job executor library that enables you to run multiple async tasks concurrency with adjustable size, while providing options for error and completion handling. It also allows termination of specific jobs or all jobs, and provides a way to wait until all jobs are completed.

## Install

```bash
# using npm
npm install job-executor
# using yarn
yarn add job-executor
```

## Usage

### Import

```js
// in ESM
import { JobExecutor } from 'job-executor';
// in CommonJS
const { JobExecutor } = require('job-executor');
```

### Example

```js
const jobExecutor = new JobExecutor({
  jobTask: async signal => {
    // Perform some long-running task here...
    // You can check the signal.aborted property periodically
    // to see if the job should be aborted.
  },
});

jobExecutor.execute(10).then(() => {
  console.log('10 jobs done!');
});

// Add more jobs to run
jobExecutor.execute(50).then(() => {
  console.log('50 jobs done!');
});
```

In this example, we create a new instance of the `JobExecutor` class with a `jobTask` function that will perform some long-running task asynchronously. We then execute 10 jobs and 50 jobs using the execute method and wait for all jobs to finish before logging a message to the console.

To terminate a job or all jobs, use the `terminate` method:

```js
// Terminates the first active job
await executor.terminate(1);

// Terminates all active jobs
await executor.terminate();
```

To wait for all jobs to complete, use the `wait` method:

```js
await executor.wait();
console.log('All jobs are done!');
```

## API

### `JobExecutor`

The `JobExecutor` class is the main class of this library and provides the following methods and properties:

- #### `constructor(options: JobExecutorOptions)`

Creates a new instance of the JobExecutor class with the given options. The available options are:

| Name       | Type                                  | Description                                                                                                                                                        |
| ---------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| jobTask    | `(signal: AbortSignal) => Promise<T>` | The task function that will be executed for each job **(required)**                                                                                                |
| jobError   | `(error: Error) => void`              | An optional error callback function that will be called if the `jobTask` function throws an error                                                                  |
| jobDone    | `(result: T) => void`                 | An optional callback function that will be called when the `jobTask` function completes successfully. The `result` parameter is assigned from the `jobTask` return |
| allJobDone | `() => void`                          | An optional callback function that will be called when all jobs have completed successfully                                                                        |
|            |

- #### `size: number`

A read-only property that returns the number of currently active jobs.

- #### `execute(size: number): Promise<void>`

Executes the given number of jobs asynchronously using the `jobTask` function. The method returns a Promise that resolves when all jobs have completed either successfully or failed.

- #### `terminate(size?: number): Promise<number>`

Aborts the given number of active jobs and waits for them to complete. If no argument is provided, all active jobs will be terminated. It returns the number of jobs that were successfully terminated.

- #### `wait(): Promise<void>`

Waits for all currently active jobs to complete before resolving. If there are no active jobs, the Promise will resolve immediately.

## Testing

This library is well tested. You can test the code as follows:

```bash
# using npm
npm test
# using yarn
yarn test
```

## Contribute

If you have anything to contribute, or functionality that you lack - you are more than welcome to participate in this!

## License

Feel free to use this library under the conditions of the MIT license.

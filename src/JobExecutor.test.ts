import { Deferred } from 'ts-deferred';
import JobExecutor, { JobExecutorTask } from './JobExecutor';

const abortableDelay = (ms: number, signal: AbortSignal) => {
  const deferred = new Deferred();

  const timeoutId = setTimeout(() => deferred.resolve(), ms);

  signal.addEventListener('abort', () => {
    clearTimeout(timeoutId);
    deferred.resolve();
  });

  return deferred.promise;
};

describe('JobExecutor', () => {
  const jobTask: JobExecutorTask<void> = async signal => {
    await abortableDelay(1000, signal);
    if (signal.aborted) throw new Error('Job was aborted');
  };

  const options = {
    jobTask,
    jobDone: jest.fn(),
    jobError: jest.fn(),
    allJobDone: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should set size to 0', () => {
      const executor = new JobExecutor(options);

      expect(executor.size).toBe(0);
    });
  });

  describe('execute', () => {
    it('should execute the given number of jobs', async () => {
      const executor = new JobExecutor(options);

      void executor.execute(3);
      expect(executor.size).toBe(3);
      expect(options.jobDone).toHaveBeenCalledTimes(0);

      await executor.wait();

      expect(executor.size).toBe(0);
      expect(options.jobDone).toHaveBeenCalledTimes(3);

      await executor.execute(3);

      expect(executor.size).toBe(0);
      expect(options.jobDone).toHaveBeenCalledTimes(6);
    });

    it('should throw an error for negative sizes', async () => {
      const executor = new JobExecutor(options);

      await expect(executor.execute(-1)).rejects.toThrow(RangeError);
    });

    it('should execute concurrently', async () => {
      const executor = new JobExecutor(options);
      const concurrent = 3;

      expect(executor.size).toBe(0);
      expect(options.jobDone).toBeCalledTimes(0);

      for (let i = 0; i < concurrent; i++) {
        void executor.execute(10);
        expect(executor.size).toBe((i + 1) * 10);
      }

      await executor.wait();

      expect(executor.size).toBe(0);
      expect(options.jobDone).toBeCalledTimes(concurrent * 10);
    });
  });

  describe('terminate', () => {
    it('should abort the given number of jobs', async () => {
      const executor = new JobExecutor(options);

      void executor.execute(5);
      expect(executor.size).toBe(5);

      await expect(executor.terminate(2)).resolves.toBe(2);
      expect(executor.size).toBe(3);
      expect(options.jobError).toHaveBeenCalledTimes(2);
    });

    it('should abort all jobs if no size is given', async () => {
      const executor = new JobExecutor(options);

      void executor.execute(5);
      expect(executor.size).toBe(5);

      await expect(executor.terminate()).resolves.toBe(5);
      expect(executor.size).toBe(0);
      expect(options.jobError).toHaveBeenCalledTimes(5);
      expect(options.allJobDone).toHaveBeenCalledTimes(1);
    });

    it('should throw an error for negative sizes', async () => {
      const executor = new JobExecutor(options);

      await expect(executor.terminate(-1)).rejects.toThrow(RangeError);
    });

    test('should abort all jobs gradually', async () => {
      const executor = new JobExecutor(options);

      expect(executor.size).toBe(0);
      expect(options.jobError).toBeCalledTimes(0);

      void executor.execute(10);
      expect(executor.size).toBe(10);

      await expect(executor.terminate()).resolves.toBe(10);
      expect(executor.size).toBe(0);
      expect(options.jobError).toBeCalledTimes(10);
      await expect(executor.terminate()).resolves.toBe(0);
      expect(executor.size).toBe(0);
      expect(options.jobError).toBeCalledTimes(10);

      void executor.execute(10);
      expect(executor.size).toBe(10);
      expect(options.jobError).toBeCalledTimes(10);

      await expect(executor.terminate(6)).resolves.toBe(6);
      expect(executor.size).toBe(4);
      expect(options.jobError).toBeCalledTimes(16);
      await expect(executor.terminate(3)).resolves.toBe(3);
      expect(executor.size).toBe(1);
      expect(options.jobError).toBeCalledTimes(19);
      await expect(executor.terminate(1)).resolves.toBe(1);
      expect(executor.size).toBe(0);
      expect(options.jobError).toBeCalledTimes(20);
    });
  });

  describe('wait', () => {
    it('should resolve when there are no more jobs', async () => {
      const executor = new JobExecutor(options);

      await executor.execute(2);
      await expect(executor.wait()).resolves.toBeUndefined();
    });

    it('should wait for all jobs to complete', async () => {
      const executor = new JobExecutor(options);

      void executor.execute(2);
      void executor.execute(3);

      setTimeout(() => void executor.terminate(1), 500);

      await expect(executor.wait()).resolves.toBeUndefined();

      expect(executor.size).toBe(0);
      expect(options.jobDone).toHaveBeenCalledTimes(4);
      expect(options.jobError).toHaveBeenCalledTimes(1);
      expect(options.allJobDone).toHaveBeenCalledTimes(1);
    });
  });
});

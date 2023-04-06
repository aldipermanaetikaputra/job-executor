import { Deferred } from 'ts-deferred';

export type JobExecutorTask<T> = (signal: AbortSignal) => Promise<T>;

export type JobExecutorOptions<T> = {
  jobTask: JobExecutorTask<T>;
  jobError?: (error: Error) => void;
  jobDone?: (result: T) => void;
  allJobDone?: () => void;
};

class JobExecutor<JobTaskReturn = unknown> {
  private jobs = new Set<Job>();
  private options: JobExecutorOptions<JobTaskReturn>;

  public get size() {
    return this.jobs.size;
  }

  constructor(options: JobExecutorOptions<JobTaskReturn>) {
    this.options = options;
  }

  private createJob() {
    const job = new Job();

    this.jobs.add(job);

    return job;
  }

  private deleteJob(job: Job) {
    job.deferred.resolve();
    this.jobs.delete(job);
    if (!this.jobs.size) this.options.allJobDone?.();
  }

  public async execute(size: number) {
    if (size < 0) throw RangeError(`Invalid size`);

    const tasks = Array.from({ length: size }, () => {
      const job = this.createJob();

      return this.options
        .jobTask(job.aborter.signal)
        .then(this.options.jobDone)
        .catch(this.options.jobError)
        .finally(() => this.deleteJob(job));
    });

    await Promise.all(tasks);
  }

  public async terminate(size?: number) {
    if (size && size < 0) throw RangeError(`Invalid size`);

    const jobs = Array.from(this.jobs.values())
      .filter(job => !job.aborter.signal.aborted)
      .slice(0, size);
    jobs.forEach(job => job.aborter.abort());
    await Promise.all(jobs.map(job => job.deferred.promise));
    return jobs.length;
  }

  public async wait(): Promise<void> {
    if (!this.size) return;

    const jobs = Array.from(this.jobs.values());

    await Promise.all(jobs.map(job => job.deferred.promise));

    return await this.wait();
  }
}

class Job {
  public aborter: AbortController;
  public deferred: Deferred<void>;

  constructor() {
    this.aborter = new AbortController();
    this.deferred = new Deferred<void>();
  }
}

export default JobExecutor;

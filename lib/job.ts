import {
    DummyWritable,
    LineTransform,
} from '@lib/stream-util';
import isObjectLike from 'lodash/isObjectLike';
import stream from 'stream';
import uuid from 'uuid';

export type Job<T> = (name: string, stream: stream.Writable) => Promise<T>;

export interface JobRunnerOptions {
    /**
     * Stream to send job output to.
     * Default: dummy stream.
     */
    stream?: NodeJS.WritableStream;

    /**
     * Maximum number of jobs that can be stored at any one time.
     * This includes both running and completed jobs.
     * When this limit is reached, and there is a new job request,
     * The `JobRunner` will first try to prune completed jobs.
     * If no completed job can be pruned, the job request will be rejected.
     * Default: 50.
     */
    maxJobs?: number;

    /**
     * Maximum age of a completed job,
     * after which the job is liable to be pruned.
     * Default: 10min.
     */
    maxAge?: number;
}

export type JobStatus<T> = ['running', undefined] | ['resolved', T] | ['rejected', any];

type CompletedJob<T> = ResolvedJob<T> | RejectedJob;

interface ResolvedJob<T> {
    state: 'resolved';
    value: T;
    completionMs: number;
}

interface RejectedJob {
    state: 'rejected';
    value: any;
    completionMs: number;
}

export interface JobRunner<T> {
    /**
     * Number of running and completed jobs stored.
     */
    readonly size: number;

    /**
     * Returns true if the maximum job storage limit has been hit and no completed job can be pruned.
     */
    readonly isFull: boolean;

    /**
     * Returns true if a job with `name` exists, false otherwise.
     */
    has(name: string): boolean;

    /**
     * Returns the status of a job with `name`, if it exists.
     * Otherwise, returns undefined.
     */
    getStatus(name: string): JobStatus<T> | undefined;

    /**
     * Run a job.
     * Returns its ID.
     */
    run(job: Job<T>): string;

    /**
     * Refuse any new jobs. Resolves when all jobs complete.
     */
    shutdown(): Promise<void>;
}

/**
 * `JobRunner` which holds job in memory.
 */
export class MemoryJobRunner<T> implements JobRunner<T> {
    readonly stream: NodeJS.WritableStream;
    readonly maxJobs: number;
    readonly maxAge: number;
    private runningJobs: Set<string>;
    private completedJobs: Map<string, CompletedJob<T>>;
    private onFinish?: () => void;

    constructor(options?: JobRunnerOptions) {
        if (!options) {
            options = {};
        }
        this.stream = options.stream || new DummyWritable();
        this.runningJobs = new Set<string>();
        this.completedJobs = new Map<string, CompletedJob<T>>();
        this.maxJobs = options.maxJobs || 50;
        this.maxAge = options.maxAge || (10 * 60 * 1000);
    }

    get size(): number {
        return this.runningJobs.size + this.completedJobs.size;
    }

    get isFull(): boolean {
        return this.size >= this.maxJobs && !this.canPruneOne();
    }

    has(name: string): boolean {
        return this.runningJobs.has(name) || this.completedJobs.has(name);
    }

    getStatus(name: string): JobStatus<T> | undefined {
        if (this.runningJobs.has(name)) {
            return ['running', undefined];
        }

        const job = this.completedJobs.get(name);
        if (!job) {
            return;
        }

        if (job.state === 'resolved') {
            return ['resolved', job.value];
        } else {
            return ['rejected', job.value];
        }
    }

    run(job: Job<T>): string {
        if (this.onFinish) {
            throw new Error('Shutting down, no new job will be accepted.');
        }
        if (this.size >= this.maxJobs && !this.pruneOne()) {
            throw new Error('Too many jobs');
        }

        // Generate a unique name
        let name: string;
        do {
            name = uuid.v4();
        } while (this.has(name));

        // Make job stream
        const logPrefix = Buffer.from(`job-${name}: `);
        const jobStream = new LineTransform(line => Buffer.concat([logPrefix, line]));
        jobStream.pipe(this.stream);

        // Run job
        job(name, jobStream).then(value => {
            this.runningJobs.delete(name);
            this.completedJobs.set(name, {
                completionMs: Date.now(),
                state: 'resolved',
                value,
            });
            jobStream.end('Job succeeded.', 'utf8');
        }, (value: any) => {
            this.runningJobs.delete(name);
            this.completedJobs.set(name, {
                completionMs: Date.now(),
                state: 'rejected',
                value,
            });
            if (isObjectLike(value) && typeof value.stack === 'string') {
                jobStream.write(value.stack, 'utf8');
            }
            jobStream.end('Job failed.', 'utf8');
        }).catch(e => {
            console.error(e);
        });
        this.runningJobs.add(name);
        return name;
    }

    shutdown(): Promise<void> {
        return new Promise<void>(resolve => {
            this.onFinish = resolve;
        });
    }

    /**
     * Returns true if a completed job can be pruned.
     */
    private canPruneOne(): boolean {
        if (!this.completedJobs.size) {
            return false;
        }
        return this.completedJobs.values().next().value.completionMs + this.maxAge <= Date.now();
    }

    /**
     * Tries to prune a completed job.
     * Returns true if a completed job could be pruned, false otherwise.
     */
    private pruneOne(): boolean {
        if (!this.completedJobs.size) {
            return false;
        }
        const [key, value] = this.completedJobs.entries().next().value;
        if (value.completionMs + this.maxAge > Date.now()) {
            return false;
        }
        this.completedJobs.delete(key);
        return true;
    }
}

/**
 * @module
 * Abstracts away the current date and time.
 */

/**
 * Provides access to the "current" date and time.
 */
export interface Clock {
    /**
     * Returns the number of milliseconds elapsed since January 1, 1970 00:00:00 UTC.
     */
    now(): number;
}

/**
 * The system clock.
 */
export class SystemClock {
    now(): number {
        return Date.now();
    }
}

/**
 * A clock for testing.
 */
export class StaticClock {
    private currSeconds: number;

    /**
     * @param currSeconds Number of seconds elapsed since January 1, 1970 00:00:00 UTC.
     */
    constructor(currSeconds: number) {
        this.currSeconds = currSeconds;
    }

    now(): number {
        return this.currSeconds * 1000;
    }

    /**
     * Advance the clock by the specified number of seconds.
     */
    advance(seconds: number): void {
        this.currSeconds += seconds;
    }

}

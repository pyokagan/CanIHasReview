/**
 * @module
 * Extra assertions.
 */
import {
    AssertionError,
} from 'assert';

export async function assertThrowsAsync(fn: () => Promise<void>): Promise<void> {
    const actual = await getActual(fn);

    if (actual === undefined) {
        throw new AssertionError({
            actual,
            expected: null,
            message: 'Missing expected exception.',
            operator: 'throws',
        });
    }
}

async function getActual(fn: () => Promise<void>): Promise<any> {
    try {
        await fn();
    } catch (e) {
      return e;
    }
}

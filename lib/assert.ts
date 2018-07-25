/**
 * @module
 * Extra assertions.
 */
import {
    HttpStatus,
} from '@lib/http';
import {
    AssertionError,
} from 'assert';
import assert from 'assert';

type CompareOptions = {
    message?: string | ((msg?: string) => void);
    expose?: boolean;
    statusCode?: HttpStatus;
};

export async function assertThrowsAsync(fn: () => Promise<void>, opts?: CompareOptions): Promise<void> {
    const myOpts = opts || {};
    const actual = await getActual(fn);

    if (actual === undefined) {
        throw new AssertionError({
            actual,
            expected: null,
            message: 'Missing expected exception.',
            operator: 'throws',
        });
    }

    if (typeof myOpts.message === 'string') {
        assert.strictEqual(actual.message, myOpts.message);
    } else if (typeof myOpts.message === 'function') {
        myOpts.message(actual.message);
    }

    if (typeof myOpts.expose === 'boolean') {
        assert.strictEqual(actual.expose, myOpts.expose);
    }

    if (myOpts.statusCode) {
        assert.strictEqual(actual.statusCode, myOpts.statusCode);
    }
}

async function getActual(fn: () => Promise<void>): Promise<any> {
    try {
        await fn();
    } catch (e) {
      return e;
    }
}

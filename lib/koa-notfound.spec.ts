import assert from 'assert';
import { HttpError } from 'http-errors';
import { suite, test } from 'mocha-typescript';
import notFound from './koa-notfound';

/**
 * Tests for `koa-notfound` middleware.
 */
@suite('lib/koa-notfound')
export class KoaNotFoundTests {
    @test
    'throws 404'(done: () => void): void {
        const m = notFound();
        m({}).then(() => {
            assert(false, 'Promise should not be resolved');
        }, (err: Partial<HttpError>) => {
            assert.strictEqual(err.status, 404);
            assert.strictEqual(err.statusCode, 404);
            assert.strictEqual(err.expose, true);
            assert.strictEqual(err.message, 'Not Found');
            assert(!err.headers);
            done();
        }).catch(done);
    }
}

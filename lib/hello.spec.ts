import assert from 'assert';
import * as hello from './hello';

describe('lib/hello', () => {
    describe('#hello()', () => {
        it(`returns 'Hello World!'`, () => {
            assert.strictEqual(hello.hello(), 'Hello World!');
        });
    });
});

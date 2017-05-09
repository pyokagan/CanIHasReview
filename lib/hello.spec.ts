import assert from 'assert';
import { suite, test } from 'mocha-typescript';
import * as hello from './hello';

@suite('lib/hello#hello()')
export class HelloTests {
    @test
    'returns \'Hello World!\''(): void {
        assert.strictEqual(hello.hello(), 'Hello World!');
    }
}

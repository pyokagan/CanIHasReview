import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import {
    extract,
    isValidName,
    isValidValue,
} from './cookies';

@suite('lib/http/cookies#isValidName()')
export class IsValidNameTest {
    @test
    'accepts valid names'(): void {
        assert.strictEqual(isValidName('foo'), true);
        assert.strictEqual(isValidName('CIHR'), true);
        assert.strictEqual(isValidName('\''), true);
    }

    @test
    'rejects invalid names'(): void {
        assert.strictEqual(isValidName(''), false);
        assert.strictEqual(isValidName('('), false);
        assert.strictEqual(isValidName(')'), false);
        assert.strictEqual(isValidName('<'), false);
        assert.strictEqual(isValidName('>'), false);
        assert.strictEqual(isValidName('@'), false);
        assert.strictEqual(isValidName(','), false);
        assert.strictEqual(isValidName(';'), false);
        assert.strictEqual(isValidName(':'), false);
        assert.strictEqual(isValidName('\\'), false);
        assert.strictEqual(isValidName('"'), false);
        assert.strictEqual(isValidName('/'), false);
        assert.strictEqual(isValidName('['), false);
        assert.strictEqual(isValidName(']'), false);
        assert.strictEqual(isValidName('?'), false);
        assert.strictEqual(isValidName('='), false);
        assert.strictEqual(isValidName('{'), false);
        assert.strictEqual(isValidName('}'), false);
        assert.strictEqual(isValidName(' '), false);
        assert.strictEqual(isValidName('\t'), false);
    }
}

@suite('lib/http/cookies#isValidValue()')
export class IsValidValueTest {
    @test
    'accepts valid values'(): void {
        assert.strictEqual(isValidValue(''), true);
        assert.strictEqual(isValidValue('='), true);
    }

    @test
    'rejects invalid values'(): void {
        assert.strictEqual(isValidValue(' '), false);
        assert.strictEqual(isValidValue('\t'), false);
        assert.strictEqual(isValidValue('"'), false);
        assert.strictEqual(isValidValue(','), false);
        assert.strictEqual(isValidValue(';'), false);
        assert.strictEqual(isValidValue('\\'), false);
    }
}

@suite('lib/http/cookies#extract()')
export class ExtractTest {
    @test
    'extracts the first matching cookie'(): void {
        assert.strictEqual(extract('', 'a'), undefined);
        assert.strictEqual(extract('a=b; a=d', 'a'), 'b');
        assert.strictEqual(extract('a=bc; de=fg; h=ij', 'a'), 'bc');
        assert.strictEqual(extract('a=bc; de=fg; h=ij', 'de'), 'fg');
        assert.strictEqual(extract('a=bc; de=fg; h=ij', 'd'), undefined);
        assert.strictEqual(extract('a=bc; de=fg; h=ij', 'h'), 'ij');
        assert.strictEqual(extract('a=bc; de=fg; h=ij;', 'h'), 'ij');
        assert.strictEqual(extract('a', 'a'), undefined);
        assert.strictEqual(extract('a=', 'a'), '');
    }

    @test
    'returns undefined if cookie value is invalid'(): void {
        assert.strictEqual(extract('a=bc d', 'a'), undefined);
        assert.strictEqual(extract('a=bc ', 'a'), undefined);
        assert.strictEqual(extract('a=b c; a=d', 'a'), undefined);
    }

    @test
    'ignores whitespace between cookies'(): void {
        assert.strictEqual(extract('a=bc;    de=fg', 'de'), 'fg');
        assert.strictEqual(extract('   a=bc', 'a'), 'bc');
    }

    @test
    'throws exception on invalid cookie name'(): void {
        assert.throws(() => extract('a=bc', ''));
    }

    @test
    'ignores invalid cookie name in header'(): void {
        assert.strictEqual(extract('[=fg; a=bc', 'a'), 'bc');
    }
}

import assert from 'assert';
import { context, suite, test } from 'mocha-typescript';
import { Fetch } from '../fetch';
import { makeGhApiForTest } from '../testutil';
import { getPrInfo, isPrInfo } from './base';

/**
 * {@link isPrInfo} unit tests
 */
@suite('lib/github#isPrInfo()')
export class GetPrInfoTest {
    static prInfoOpen = require('./testdata/PrInfo-open');
    static prInfoClosed = require('./testdata/PrInfo-closed');
    static prInfoMerged = require('./testdata/PrInfo-merged');

    @test
    'validates open pr'(): void {
        assert(isPrInfo(GetPrInfoTest.prInfoOpen));
    }

    @test
    'validates closed pr'(): void {
        assert(isPrInfo(GetPrInfoTest.prInfoClosed));
    }

    @test
    'validates merged pr'(): void {
        assert(isPrInfo(GetPrInfoTest.prInfoMerged));
    }
}

/**
 * {@link getPrInfo} integration tests with GitHub.
 */
@suite('lib/github#getPrInfo() [github]')
export class GetPrInfoGithubTest {
    @context private mocha: Mocha.IBeforeAndAfterContext;
    private ghApi: Fetch;

    before(): void {
        this.ghApi = makeGhApiForTest(this.mocha);
    }

    @test
    async 'works with merged pr'(): Promise<void> {
        await getPrInfo(this.ghApi, 'se-edu', 'addressbook-level4', 251);
    }

    @test
    async 'works with closed pr'(): Promise<void> {
        await getPrInfo(this.ghApi, 'se-edu', 'addressbook-level4', 359);
    }

    @test
    async 'works with open pr'(): Promise<void> {
        await getPrInfo(this.ghApi, 'se-edu', 'addressbook-level4', 212);
    }
}

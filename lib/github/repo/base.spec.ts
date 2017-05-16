import { context, suite, test } from 'mocha-typescript';
import { Fetch } from '../fetch';
import { makeGhApiForTest } from '../testutil';
import { getRepoInfo } from './base';

/**
 * {@link getRepoInfo} integration tests with GitHub.
 */
@suite('lib/github/repo/base#getRepoInfo() [github]')
export class GetPrInfoGithubTest {
    @context private mocha: Mocha.IBeforeAndAfterContext;
    private ghApi: Fetch;

    before(): void {
        this.ghApi = makeGhApiForTest(this.mocha);
    }

    @test
    async 'works'(): Promise<void> {
        await getRepoInfo(this.ghApi, 'se-edu', 'addressbook-level4');
    }
}

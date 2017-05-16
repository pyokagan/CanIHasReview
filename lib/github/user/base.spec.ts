import {
    context,
    suite,
    test,
} from 'mocha-typescript';
import {
    Fetch,
} from '../fetch';
import {
    createApiForTest,
} from '../testutil';
import {
    getAuthenticatedUserInfo,
    getUserInfo,
} from './base';

/**
 * {@link getUserInfo} integration tests with GitHub.
 */
@suite('lib/github/user#getUserInfo() [github]')
export class GetUserInfoGithubTest {
    @context private mocha: Mocha.IBeforeAndAfterContext;
    private ghApi: Fetch;

    before(): void {
        this.ghApi = createApiForTest(this.mocha);
    }

    @test
    async 'works with user'(): Promise<void> {
        await getUserInfo(this.ghApi, 'pyokagan');
    }

    @test
    async 'works with organization'(): Promise<void> {
        await getUserInfo(this.ghApi, 'se-edu');
    }
}

/**
 * {@link getAuthenticatedUserInfo} integration tests with GitHub.
 */
@suite('lib/github/user#getAuthenticatedUserInfo() [github]')
export class GetAuthenticatedUserInfoGithubTest {
    @context private mocha: Mocha.IBeforeAndAfterContext;
    private ghApi: Fetch;

    before(): void {
        this.ghApi = createApiForTest(this.mocha);
    }

    @test
    async 'does not error out'(): Promise<void> {
        await getAuthenticatedUserInfo(this.ghApi);
    }
}

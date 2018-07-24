import {
    assertThrowsAsync,
} from '@lib/assert';
import {
    StaticClock,
} from '@lib/clock';
import * as fakeGithub from '@lib/fake-github';
import * as github from '@lib/github';
import {
    createRequest,
    Fetch,
    HttpMethod,
    HttpStatus,
    mockFetch,
    Response,
} from '@lib/http';
import {
    AuthContext,
} from '@webui/auth/server';
import renderServer from '@webui/renderServer';
import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import PrGet from './entry';
import handlePullGet from './server';

@suite('webui/pull/get')
export class HandlerTest {
    clock: StaticClock;
    githubModel: fakeGithub.GithubModel;
    fetch: Fetch;
    auth: AuthContext;

    async before(): Promise<void> {
        this.clock = new StaticClock(1112911993);
        this.githubModel = await fakeGithub.createGithubModel({
            clock: this.clock,
        });
        await fakeGithub.createUser(this.githubModel, 'testuser');
        await fakeGithub.createOauthClient(this.githubModel, 'clientid', 'clientsecret');
        await fakeGithub.createOauthToken(this.githubModel, 'testusertoken', 'clientid', 'testuser');
        this.fetch = mockFetch((req, resp) => {
            return fakeGithub.api3main({
                model: this.githubModel,
                req,
                resp,
            });
        });
        this.auth = {
            ghUserApi: github.createAccessTokenApi({
                fetch: this.fetch,
                token: 'testusertoken',
                userAgent: 'CanIHasReview',
            }),
            ghUserInfo: await fakeGithub.getPublicUserInfo(this.githubModel, 'testuser'),
        };

        // Setup repos
        await fakeGithub.createOrganization(this.githubModel, 'se-edu');
        await fakeGithub.createRepo(this.githubModel, 'se-edu', 'addressbook-level4');
        {
            const shell = await fakeGithub.cloneRepo(this.githubModel, 'se-edu', 'addressbook-level4');
            await shell.writeFile('file', 'test file');
            await shell.checkCall('git', ['add', 'file']);
            await shell.checkCall('git', ['commit', '-m', 'initial commit']);
            await shell.checkCall('git', ['push', 'origin', 'master']);
            shell.cleanup();
        }
        await fakeGithub.forkRepo(this.githubModel, 'se-edu', 'addressbook-level4', 'testuser');
        {
            const shell = await fakeGithub.cloneRepo(this.githubModel, 'testuser', 'addressbook-level4');
            await shell.checkCall('git', ['checkout', '-b', 'side']);
            await shell.writeFile('file', 'side content');
            await shell.checkCall('git', ['add', 'file']);
            await shell.checkCall('git', ['commit', '-m', 'commit on side branch']);
            await shell.checkCall('git', ['push', 'origin', 'side']);
            shell.cleanup();
        }
        await fakeGithub.createPr(this.githubModel, 'se-edu', 'addressbook-level4', 'master', 'testuser:side');
    }

    after(): void {
        this.githubModel.cleanup();
    }

    @test
    async 'throws error on bad request path'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/',
        });
        const resp = new Response();
        await assertThrowsAsync(() => handlePullGet({
            auth: this.auth,
            req,
            resp,
        }), {
            message: 'bad request path: /',
        });
    }

    @test
    async 'only accepts GET/HEAD method'(): Promise<void> {
        for (const method of HttpMethod) {
            if (method === 'GET' || method === 'HEAD') {
                continue;
            }
            const req = createRequest({
                id: '',
                method,
                url: 'http://localhost/se-edu/addressbook-level4/pull/1',
            });
            const resp = new Response();
            await assertThrowsAsync(() => handlePullGet({
                auth: this.auth,
                req,
                resp,
            }), {
                message: `bad request method: ${method}`,
            });
        }
    }

    @test
    async 'throws error on unsupported repo'(): Promise<void> {
        await fakeGithub.createOrganization(this.githubModel, 'unsupported-org');
        await fakeGithub.forkRepo(this.githubModel, 'se-edu', 'addressbook-level4', 'unsupported-org');
        await fakeGithub.createPr(this.githubModel, 'unsupported-org', 'addressbook-level4', 'master', 'testuser:side');
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/unsupported-org/addressbook-level4/pull/1',
        });
        const resp = new Response();
        await assertThrowsAsync(() => handlePullGet({
            auth: this.auth,
            req,
            resp,
        }), {
            message: 'Unsupported repo',
            statusCode: HttpStatus.NOT_FOUND,
        });
    }

    @test
    async 'renders PrGet component'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/se-edu/addressbook-level4/pull/1',
        });
        const resp = new Response();
        const expectedResp = new Response();
        const prCommits = await fakeGithub.getPrCommits(this.githubModel, 'se-edu', 'addressbook-level4', 1);
        const prInfo = await fakeGithub.getPrInfo(this.githubModel, 'se-edu', 'addressbook-level4', 1);
        renderServer(expectedResp, __dirname, 'CanIHasReview', PrGet, {
            ghUserInfo: await fakeGithub.getPublicUserInfo(this.githubModel, 'testuser'),
            mountPath: '',
            pathname: req.pathname,
            prCheckResult: {},
            prCommits,
            prInfo,
            search: req.search,
        });
        await handlePullGet({
            auth: this.auth,
            req,
            resp,
        });
        assertResp(resp, expectedResp);
    }
}

function assertResp(actual: Response, expected: Response): void {
    assert.deepStrictEqual((actual as any).webuiReactConfig, (expected as any).webuiReactConfig);
    assert.deepStrictEqual(actual, expected);
}

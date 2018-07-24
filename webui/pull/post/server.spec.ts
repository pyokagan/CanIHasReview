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
    redirectSeeOther,
    Response,
} from '@lib/http';
import {
    Job,
    JobRunner,
    JobStatus,
} from '@lib/job';
import {
    AuthContext,
} from '@webui/auth/server';
import {
    jobRoute,
} from '@webui/routes';
import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import handlePullPost from './server';

@suite('webui/pull/post')
export class HandlerTest {
    clock: StaticClock;
    githubModel: fakeGithub.GithubModel;
    fetch: Fetch;
    auth: AuthContext;
    jobRunner: MockJobRunner<{}>;

    async before(): Promise<void> {
        this.jobRunner = new MockJobRunner<{}>();
        this.clock = new StaticClock(1112911993);
        this.githubModel = await fakeGithub.createGithubModel({
            clock: this.clock,
        });
        await fakeGithub.createUser(this.githubModel, 'testuser');
        await fakeGithub.createOauthClient(this.githubModel, 'clientid', 'clientsecret');
        await fakeGithub.createOauthToken(this.githubModel, 'testusertoken', 'clientid', 'testuser');
        await fakeGithub.createUser(this.githubModel, 'CanIHasReview-bot');
        await fakeGithub.createOauthToken(this.githubModel, 'bottoken', 'clientid', 'CanIHasReview-bot');
        this.fetch = mockFetch((req, resp) => {
            return fakeGithub.api3main({
                model: this.githubModel,
                req,
                resp,
            });
        });
        this.auth = {
            ghUserApi: github.createApi({
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
        await assertThrowsAsync(() => handlePullPost({
            auth: this.auth,
            fetch: this.fetch,
            githubToken: 'bottoken',
            jobRunner: this.jobRunner,
            req,
            resp,
        }), {
            message: 'bad request path: /',
        });
        assert.strictEqual(this.jobRunner.size, 0);
    }

    @test
    async 'does not accept non-POST method'(): Promise<void> {
        for (const method of HttpMethod) {
            if (method === 'POST') {
                continue;
            }
            const req = createRequest({
                id: '',
                method,
                url: 'http://localhost/se-edu/addressbook-level4/pull/1',
            });
            const resp = new Response();
            await assertThrowsAsync(() => handlePullPost({
                auth: this.auth,
                fetch: this.fetch,
                githubToken: 'bottoken',
                jobRunner: this.jobRunner,
                req,
                resp,
            }), {
                message: `bad request method: ${method}`,
            });
            assert.strictEqual(this.jobRunner.size, 0);
        }
    }

    @test
    async 'throws error on unsupported repo'(): Promise<void> {
        await fakeGithub.createOrganization(this.githubModel, 'unsupported-org');
        await fakeGithub.forkRepo(this.githubModel, 'se-edu', 'addressbook-level4', 'unsupported-org');
        await fakeGithub.createPr(this.githubModel, 'unsupported-org', 'addressbook-level4', 'master', 'testuser:side');
        const req = createRequest({
            id: '',
            method: 'POST',
            url: 'http://localhost/unsupported-org/addressbook-level4/pull/1',
        });
        const resp = new Response();
        await assertThrowsAsync(() => handlePullPost({
            auth: this.auth,
            fetch: this.fetch,
            githubToken: 'bottoken',
            jobRunner: this.jobRunner,
            req,
            resp,
        }), {
            message: 'Unsupported repo',
            statusCode: HttpStatus.NOT_FOUND,
        });
        assert.strictEqual(this.jobRunner.size, 0);
    }

    @test
    async 'submits a newPrVersion job'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'POST',
            url: 'http://localhost/se-edu/addressbook-level4/pull/1',
        });
        const resp = new Response();
        const expectedResp = new Response();
        await handlePullPost({
            auth: this.auth,
            fetch: this.fetch,
            githubToken: 'bottoken',
            jobRunner: this.jobRunner,
            req,
            resp,
        });
        redirectSeeOther(expectedResp, jobRoute.toPath({ name: '0' }, ''));
        assert.deepEqual(resp, expectedResp);

        // Retrieve and run job
        assert.strictEqual(this.jobRunner.size, 1);
        const job = this.jobRunner.jobs[0];
        await job('0', process.stdout);

        // TODO: validate results
    }
}

class MockJobRunner<T> implements JobRunner<T> {
    jobs: Job<T>[];
    jobNames: string[];
    jobIdCtr: number;

    constructor() {
        this.jobs = [];
        this.jobNames = [];
        this.jobIdCtr = 0;
    }

    get size(): number {
        return this.jobs.length;
    }

    get isFull(): boolean {
        return false;
    }

    has(name: string): boolean {
        return this.jobNames.indexOf(name) >= 0;
    }

    getStatus(name: string): JobStatus<T> | undefined {
        if (!this.has(name)) {
            return;
        }
        return ['running', undefined];
    }

    run(job: Job<T>): string {
        const jobName = `${this.jobIdCtr++}`;
        this.jobs.push(job);
        this.jobNames.push(jobName);
        return jobName;
    }

    shutdown(): Promise<void> {
        throw new Error('not supported');
    }
}

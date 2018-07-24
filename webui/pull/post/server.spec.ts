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

const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvNIj1OhMraob+GmnCFWq
Jw4I48dGQx6PkA7IfXbSFVg3F3l9+9YtyM8txS8tqw7tCKGWECJyQ+MdquwUeNfD
v1vBIMWs65hc0b5B0o2sFu8t8MhQpBI3URVO+7erR/bJb5EDkBDFFhp+De4O0Z4J
Qgf9idhegL5+vXs3mivZFV2ogtFYUtE7CS0bboXDzGCe+BOJzUXg0hSFwET3x4tu
aGEn8YRB+JfFRnInSelVNxS0yGVJwlbqeKCZVcXl8nkWJpT8Mj9qhRwNkLN5APYy
F8RqC+L9sEZtAW1Vi7w3mlr7hHBd8zGc/gSMxJCc2iKtfNIBW04H7ptXDAZeAGfO
HQIDAQAB
-----END PUBLIC KEY-----
`;

const PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEAvNIj1OhMraob+GmnCFWqJw4I48dGQx6PkA7IfXbSFVg3F3l9
+9YtyM8txS8tqw7tCKGWECJyQ+MdquwUeNfDv1vBIMWs65hc0b5B0o2sFu8t8MhQ
pBI3URVO+7erR/bJb5EDkBDFFhp+De4O0Z4JQgf9idhegL5+vXs3mivZFV2ogtFY
UtE7CS0bboXDzGCe+BOJzUXg0hSFwET3x4tuaGEn8YRB+JfFRnInSelVNxS0yGVJ
wlbqeKCZVcXl8nkWJpT8Mj9qhRwNkLN5APYyF8RqC+L9sEZtAW1Vi7w3mlr7hHBd
8zGc/gSMxJCc2iKtfNIBW04H7ptXDAZeAGfOHQIDAQABAoIBAQCp8w4TNJ7HdKPG
O/n+U3RZwJUZxyOjh985j0S/QHIoigTUGSLex9DfvDH7F9Kn80A/k4jIruhf2Ay8
6c4nUjS6iLBUefeA+dsZYYBHLgKlhdO4s+N5OXgWf/JeN9tvY129EC2/vohVs7Sf
fxRRcUft6dk298tfX5Ydn8jU+ABk7CFGlZ5kSDmd52/sGvC1lsMh1NKRpdi6OhZh
r8WOAd07VzlGtBUqDvZnq++o6ik4d/CLDmNelJ14pK+L1uNVXO9HSi2cLiyFyoI2
qQWRBEmiqnB+zEXFiKEQNhSXUI1kaRpyC8P/FP9UvXD0jj9JtcakfgRwznnVw43k
v6Wspk41AoGBAPBQUY+/ZIXBXUiB6gN2tH33uCqBaYPTjixIS8OcHuU24ENkYWh1
nLRFxc1wJ8eZeO3r73LBRhhSUnlHf3DQyNe0QW27hUwhZ0OejoWdYLyCohDHG/nC
vS9qJErLYgap5Wk/Wym2ilgDb58BkbvfXpgJsWIZJo0Fyi2/brEelvdLAoGBAMkl
XfDVZdEWAIlBefzFNgtyWZdU4tUdYNP8cfG2jUrwva38TnQfEggHeytaZ9mzY9Sh
vt29aRPitKI+NCEVT03kNo2ZPB08Nm52rAsbSi0HFDZ7pxELRGyGFMgDsK/7hQWt
R45LsPnhtMohfP1NW+tcHTy7311qB0KZh1D1/Oc3AoGAbkTsqAEypw1rOHIkZyJ4
/7RDlX18ZTkV68vguAlTQ+pCTaop6DzPgwjhErt8BWKu0r2ISifVeiOMJIpiN+oV
vqS/wRJiv+Qz9hszWqw0T0vCAeDbPWfWV4Nk080vVc9vrTOdKS7RnEE3XsbhkEuW
pD0OX+0ae2tEsmk86ZkXvLECgYEAnWNvrhJMKN5ebQeeu/pT34EKOS9ijf7+1OCj
B88fn5Pf11Okz5fANCgmaDXFLMMBSk+FWVvr7HNng8vIXlqeQwRe600LjJSgwq54
z/f6gmEXn8oBX4TBdWk0uYyppAnafCap5t2zDNNe8wphEpKFahQZjHw0upNMOwCG
sQLJcOECgYABGME2oDvRGorW/H8VBxjjaZqpQVRBmVEdxmKpt5PXB+szU+eFHQ4I
bjP0PCuOwci3uC6pnoKX6cTO5ogUbGEX6+FOLN5PSo3hXe+1KbPCzuMPmjaGIo4R
+RQ/tDVpo/NyJdQJO0M0ofPql++O2i6D8dZw6sYB9QynsKZUPlDWtQ==
-----END RSA PRIVATE KEY-----
`;

@suite('webui/pull/post')
export class HandlerTest {
    clock: StaticClock;
    appId: number;
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
        this.appId = await fakeGithub.createApp(this.githubModel, 'CanIHasReview', PUBLIC_KEY);
        await fakeGithub.createUser(this.githubModel, 'testuser');
        await fakeGithub.createOauthToken(this.githubModel, 'testusertoken', 'CanIHasReview.oauthclientid', 'testuser');
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
        await fakeGithub.createInstallation(this.githubModel, this.appId, 'se-edu', 'addressbook-level4');
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
            githubAppId: this.appId,
            githubAppPrivateKey: PRIVATE_KEY,
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
                githubAppId: this.appId,
                githubAppPrivateKey: PRIVATE_KEY,
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
            githubAppId: this.appId,
            githubAppPrivateKey: PRIVATE_KEY,
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
            githubAppId: this.appId,
            githubAppPrivateKey: PRIVATE_KEY,
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

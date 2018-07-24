import {
    createRequest,
    HttpStatus,
    Response,
    setHeader,
} from '@lib/http';
import {
    JobRunner,
    MemoryJobRunner,
} from '@lib/job';
import handleAuthRoutes from '@webui/auth/server';
import handleError from '@webui/error/server';
import handleHome from '@webui/home/server';
import handleJob from '@webui/job/server';
import {
    setSession,
} from '@webui/session';
import assert from 'assert';
import fetchPonyfill from 'fetch-ponyfill';
import createHttpError from 'http-errors';
import {
    suite,
    test,
} from 'mocha-typescript';
import {
    main,
} from './server';

const { fetch } = fetchPonyfill();

const sessionSecret = 'abc123';
const githubClientId = 'dummyGithubClientId';
const githubClientSecret = 'dummyGithubClientSecret';
const githubToken = 'dummyGithubToken';

@suite('webui/server#main')
export class MainTest {
    private jobRunner: JobRunner<{}>;

    before(): void {
        this.jobRunner = new MemoryJobRunner<{}>();
    }

    @test
    async 'routes to home'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/',
        });
        const resp = new Response();
        const expectedResp = new Response();
        await handleHome({
            auth: undefined,
            req,
            resp: expectedResp,
        });
        setCacheHeader(expectedResp);
        setSession(expectedResp, {}, { secret: sessionSecret });
        await main({
            fetch,
            githubClientId,
            githubClientSecret,
            githubToken,
            jobRunner: this.jobRunner,
            req,
            resp,
            sessionSecret,
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'routes to auth'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/auth/login',
        });
        const resp = new Response();
        const expectedResp = new Response();
        await handleAuthRoutes({
            fetch,
            githubClientId,
            githubClientSecret,
            req,
            resp: expectedResp,
            session: {},
        });
        setCacheHeader(expectedResp);
        setSession(expectedResp, {}, { secret: sessionSecret });
        await main({
            fetch,
            githubClientId,
            githubClientSecret,
            githubToken,
            jobRunner: this.jobRunner,
            req,
            resp,
            sessionSecret,
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'routes to job'(): Promise<void> {
        const jobName = this.jobRunner.run((name, stream) => Promise.resolve({}));
        await Promise.resolve(); // let job complete first
        const req = createRequest({
            id: '',
            method: 'GET',
            url: `http://localhost/site/job/${encodeURIComponent(jobName)}`,
        });
        const expectedResp = new Response();
        await handleJob({
            auth: undefined,
            jobRunner: this.jobRunner,
            req,
            resp: expectedResp,
        });
        setCacheHeader(expectedResp);
        setSession(expectedResp, {}, { secret: sessionSecret });

        const resp = new Response();
        await main({
            fetch,
            githubClientId,
            githubClientSecret,
            githubToken,
            jobRunner: this.jobRunner,
            req,
            resp,
            sessionSecret,
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'HttpStatus.NOT_FOUND if no route match'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/pathThatDoesNotExist',
        });
        const resp = new Response();
        const expectedResp = new Response();
        await handleError({
            auth: undefined,
            e: createHttpError(HttpStatus.NOT_FOUND),
            req,
            resp: expectedResp,
        });
        setCacheHeader(expectedResp);
        setSession(expectedResp, {}, { secret: sessionSecret });
        await main({
            fetch,
            githubClientId,
            githubClientSecret,
            githubToken,
            jobRunner: this.jobRunner,
            req,
            resp,
            sessionSecret,
        });
        assertResp(resp, expectedResp);
    }
}

function assertResp(actual: Response, expected: Response): void {
    assert.deepStrictEqual((actual as any).webuiReactConfig, (expected as any).webuiReactConfig);
    assert.deepStrictEqual(actual, expected);
}

function setCacheHeader(resp: Response): void {
    setHeader(resp, 'Cache-Control', 'no-cache, no-store, must-revalidate');
}

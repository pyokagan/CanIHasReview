import {
    createRequest,
    HttpStatus,
    Response,
    setHeader,
} from '@lib/http';
import handleError from '@webui/error/server';
import handleHome from '@webui/home/server';
import {
    setSession,
} from '@webui/session';
import assert from 'assert';
import createHttpError from 'http-errors';
import {
    suite,
    test,
} from 'mocha-typescript';
import {
    main,
} from './server';

const sessionSecret = 'abc123';

@suite('webui/server#main')
export class MainTest {
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
            req,
            resp: expectedResp,
        });
        setCacheHeader(expectedResp);
        setSession(expectedResp, {}, { secret: sessionSecret });
        await main(req, resp, {
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
            e: createHttpError(HttpStatus.NOT_FOUND),
            req,
            resp: expectedResp,
        });
        setCacheHeader(expectedResp);
        setSession(expectedResp, {}, { secret: sessionSecret });
        await main(req, resp, {
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

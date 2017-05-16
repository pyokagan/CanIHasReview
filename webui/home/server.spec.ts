import {
    assertThrowsAsync,
} from '@lib/assert';
import {
    createRequest,
    Response,
} from '@lib/http';
import renderServer from '@webui/renderServer';
import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import Home from './entry';
import handleHome from './server';

@suite('webui/home')
export class HandlerTest {
    @test
    async 'does not accept // pathname'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost//',
        });
        const resp = new Response();
        await assertThrowsAsync(() => handleHome({
            auth: undefined,
            req,
            resp,
        }));
    }

    @test
    async 'does not accept POST method'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'POST',
            url: 'http://localhost/',
        });
        const resp = new Response();
        await assertThrowsAsync(() => handleHome({
            auth: undefined,
            req,
            resp,
        }));
    }

    @test
    async 'renders Home component'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/',
        });
        const resp = new Response();
        const expectedResp = new Response();
        renderServer(expectedResp, __dirname, 'CanIHasReview', Home, {
            ghUserInfo: null,
            mountPath: '',
            pathname: req.pathname,
            search: req.search,
        });
        await handleHome({
            auth: undefined,
            req,
            resp,
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'responds to GET / with query string'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/?some=query&string',
        });
        const resp = new Response();
        const expectedResp = new Response();
        renderServer(expectedResp, __dirname, 'CanIHasReview', Home, {
            ghUserInfo: null,
            mountPath: '',
            pathname: req.pathname,
            search: req.search,
        });
        await handleHome({
            auth: undefined,
            req,
            resp,
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'passes down mountPath'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost/',
        });
        req.mountPath = '/foo';
        const resp = new Response();
        const expectedResp = new Response();
        renderServer(expectedResp, __dirname, 'CanIHasReview', Home, {
            ghUserInfo: null,
            mountPath: '/foo',
            pathname: req.pathname,
            search: req.search,
        });
        await handleHome({
            auth: undefined,
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

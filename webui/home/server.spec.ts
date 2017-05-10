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
    async 'only responds to /'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'GET',
            url: 'http://localhost//',
        });
        const resp = new Response();
        const expectedResp = new Response();
        const ret = await handleHome({
            req,
            resp,
        });
        assert.strictEqual(ret, false);
        assertResp(resp, expectedResp);
    }

    @test
    async 'does not respond to POST'(): Promise<void> {
        const req = createRequest({
            id: '',
            method: 'POST',
            url: 'http://localhost/',
        });
        const resp = new Response();
        const expectedResp = new Response();
        const ret = await handleHome({
            req,
            resp,
        });
        assert.strictEqual(ret, false);
        assertResp(resp, expectedResp);
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
            mountPath: '',
        });
        const ret = await handleHome({
            req,
            resp,
        });
        assert.strictEqual(ret, true);
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
            mountPath: '',
        });
        const ret = await handleHome({
            req,
            resp,
        });
        assert.strictEqual(ret, true);
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
            mountPath: '/foo',
        });
        const ret = await handleHome({
            req,
            resp,
        });
        assert.strictEqual(ret, true);
        assertResp(resp, expectedResp);
    }
}

function assertResp(actual: Response, expected: Response): void {
    assert.deepStrictEqual((actual as any).webuiReactConfig, (expected as any).webuiReactConfig);
    assert.deepStrictEqual(actual, expected);
}

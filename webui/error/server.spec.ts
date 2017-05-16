import {
    createRequest,
    HttpStatus,
    Request,
    Response,
} from '@lib/http';
import renderServer from '@webui/renderServer';
import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import ErrorPage from './entry';
import handleError from './server';

@suite('webui/error')
export class HandlerTest {
    private req: Request;
    private reqId: string;

    before(): void {
        this.reqId = 'someId';
        this.req = createRequest({
            id: this.reqId,
            method: 'GET',
            url: 'http://localhost/',
        });
    }

    @test
    async 'renders exception\'s status, message'(): Promise<void> {
        const resp = new Response();
        const e = Object.assign(new Error('Hello World!'), {
            expose: true,
            status: HttpStatus.NOT_FOUND,
            statusCode: HttpStatus.NOT_FOUND,
        });
        await handleError({
            e,
            req: this.req,
            resp,
        });

        const expectedResp = new Response();
        expectedResp.status = HttpStatus.NOT_FOUND;
        renderServer(expectedResp, __dirname, '404 Not Found', ErrorPage, {
            ghUserInfo: null,
            message: 'Hello World!',
            mountPath: '',
            pathname: this.req.pathname,
            reqId: undefined, // "undefined" since expose is true
            search: this.req.search,
            title: '404 Not Found',
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'exception has invalid status code'(): Promise<void> {
        const resp = new Response();
        const e = Object.assign(new Error('Goodbye World!'), {
            expose: true,
            status: 123,
            statusCode: 123,
        });
        await handleError({
            e,
            req: this.req,
            resp,
        });

        const expectedResp = new Response();
        expectedResp.status = 123;
        renderServer(expectedResp, __dirname, '123 Unknown Error', ErrorPage, {
            ghUserInfo: null,
            message: 'Goodbye World!',
            mountPath: '',
            pathname: this.req.pathname,
            reqId: undefined, // "undefined" since expose is true
            search: this.req.search,
            title: '123 Unknown Error',
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'exception has no status code, 500 is used'(): Promise<void> {
        const resp = new Response();
        const e = Object.assign(new Error('Really unexpected error'), {
            expose: true,
        });
        await handleError({
            e,
            req: this.req,
            resp,
        });

        const expectedResp = new Response();
        expectedResp.status = HttpStatus.INTERNAL_SERVER_ERROR;
        renderServer(expectedResp, __dirname, '500 Internal Server Error', ErrorPage, {
            ghUserInfo: null,
            message: 'Really unexpected error',
            mountPath: '',
            pathname: this.req.pathname,
            reqId: undefined, // "undefined" since expose is true
            search: this.req.search,
            title: '500 Internal Server Error',
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'exception expose is false, exception message hidden from page'(): Promise<void> {
        const resp = new Response();
        const e = Object.assign(new Error('Very secret error'), {
            expose: false,
            status: 200,
            statusCode: 200,
        });
        await handleError({
            e,
            req: this.req,
            resp,
        });

        const expectedResp = new Response();
        expectedResp.status = 200;
        renderServer(expectedResp, __dirname, '200 OK', ErrorPage, {
            ghUserInfo: null,
            message: '',
            mountPath: '',
            pathname: this.req.pathname,
            reqId: this.reqId, // defined since expose is false
            search: this.req.search,
            title: '200 OK',
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'exception expose is not provided but statusCode >= 500, exception message hidden'(): Promise<void> {
        const resp = new Response();
        const e = Object.assign(new Error('Accidental secret error'), {
            status: 500,
            statusCode: 500,
        });
        await handleError({
            e,
            req: this.req,
            resp,
        });

        const expectedResp = new Response();
        expectedResp.status = 500;
        renderServer(expectedResp, __dirname, '500 Internal Server Error', ErrorPage, {
            ghUserInfo: null,
            message: '',
            mountPath: '',
            pathname: this.req.pathname,
            reqId: this.reqId, // defined since expose is false
            search: this.req.search,
            title: '500 Internal Server Error',
        });
        assertResp(resp, expectedResp);
    }

    @test
    async 'passes down mountPath'(): Promise<void> {
        this.req.mountPath = '/foo';
        const resp = new Response();
        const e = new Error();
        await handleError({
            e,
            req: this.req,
            resp,
        });

        const expectedResp = new Response();
        expectedResp.status = 500;
        renderServer(expectedResp, __dirname, '500 Internal Server Error', ErrorPage, {
            ghUserInfo: null,
            message: '',
            mountPath: '/foo',
            pathname: this.req.pathname,
            reqId: this.reqId, // defined since expose is false
            search: this.req.search,
            title: '500 Internal Server Error',
        });
        assertResp(resp, expectedResp);
    }
}

function assertResp(actual: Response, expected: Response): void {
    assert.deepStrictEqual((actual as any).webuiReactConfig, (expected as any).webuiReactConfig);
    assert.deepStrictEqual(actual, expected);
}

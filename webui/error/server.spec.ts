import assert from 'assert';
import { HttpError } from 'http-errors';
import { suite, test } from 'mocha-typescript';
import sinon from 'sinon';
import { createUrlCtx } from '../../lib/koa-ctx';
import { createStubConsole, StubLoggerConsole } from '../../lib/koa-logger.spec';
import { ErrorPage, ErrorPageProps } from './entry';
import { Ctx, middleware } from './server';

@suite('webui/error')
export class MiddlewareTest {
    private render: sinon.SinonSpy;
    private console: StubLoggerConsole;
    private reqId: string;
    private ctx: Ctx;
    private expectedCtx: Ctx;

    before(): void {
        this.render = sinon.spy();
        this.console = createStubConsole();
        this.reqId = 'someId';
        this.ctx = Object.assign(createUrlCtx('GET', 'http://localhost/'), {
            console: this.console,
            render: this.render,
            reqId: this.reqId,
        });
        this.expectedCtx = Object.assign({}, this.ctx);
    }

    @test
    async 'does nothing if next() is successful'(): Promise<void> {
        const next = async () => undefined;
        await middleware(this.ctx, next);
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
        sinon.assert.notCalled(this.render);
    }

    @test
    async 'does nothing if next() is not provided'(): Promise<void> {
        await middleware(this.ctx);
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
        sinon.assert.notCalled(this.render);
    }

    @test
    async 'renders exception\'s status, message'(): Promise<void> {
        const next = async () => {
            const e: HttpError = Object.assign(new Error('Hello World!'), {
                expose: true,
                status: 404,
                statusCode: 404,
            });
            throw e;
        };
        await middleware(this.ctx, next);
        const expectedProps: ErrorPageProps = {
            ghUserInfo: null,
            message: 'Hello World!',
            mountPath: '/',
            path: '/',
            reqId: undefined, // "undefined" since expose is true
            search: '',
            title: '404 Not Found',
        };
        sinon.assert.calledOnce(this.render);
        sinon.assert.calledWith(this.render, __dirname, '404 Not Found', ErrorPage, expectedProps);
        assert.strictEqual(this.ctx.status, 404);
        this.expectedCtx.status = 404;
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
    }

    @test
    async 'exception has invalid status code'(): Promise<void> {
        const next = async () => {
            const e: HttpError = Object.assign(new Error('Goodbye World!'), {
                expose: true,
                status: 123,
                statusCode: 123,
            });
            throw e;
        };
        await middleware(this.ctx, next);
        const expectedProps: ErrorPageProps = {
            ghUserInfo: null,
            message: 'Goodbye World!',
            mountPath: '/',
            path: '/',
            reqId: undefined, // "undefined" since expose is true
            search: '',
            title: '123 Unknown Error',
        };
        sinon.assert.calledOnce(this.render);
        sinon.assert.calledWith(this.render, __dirname, '123 Unknown Error', ErrorPage, expectedProps);
        this.expectedCtx.status = 123;
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
    }

    @test
    async 'exception has no status code, 500 is used'(): Promise<void> {
        const next = async () => {
            throw Object.assign(new Error('Really unexpected error'), {
                expose: true,
            });
        };
        await middleware(this.ctx, next);
        const expectedProps: ErrorPageProps = {
            ghUserInfo: null,
            message: 'Really unexpected error',
            mountPath: '/',
            path: '/',
            reqId: undefined, // "undefined" since expose is true
            search: '',
            title: '500 Internal Server Error',
        };
        sinon.assert.calledOnce(this.render);
        sinon.assert.calledWith(this.render, __dirname, '500 Internal Server Error', ErrorPage, expectedProps);
        this.expectedCtx.status = 500;
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
    }

    @test
    async 'exception expose is false, exception message hidden from page'(): Promise<void> {
        const next = async () => {
            const e: HttpError = Object.assign(new Error('Very secret error'), {
                expose: false,
                status: 200,
                statusCode: 200,
            });
            throw e;
        };
        await middleware(this.ctx, next);
        const expectedProps: ErrorPageProps = {
            ghUserInfo: null,
            message: '',
            mountPath: '/',
            path: '/',
            reqId: this.reqId, // defined since expose is false
            search: '',
            title: '200 OK',
        };
        sinon.assert.calledOnce(this.render);
        sinon.assert.calledWith(this.render, __dirname, '200 OK', ErrorPage, expectedProps);
        this.expectedCtx.status = 200;
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
    }

    @test
    async 'exception expose is not provided but statusCode >= 500, exception message hidden'(): Promise<void> {
        const next = async () => {
            throw Object.assign(new Error('Accidental secret error'), {
                status: 500,
                statusCode: 500,
            });
        };
        await middleware(this.ctx, next);
        const expectedProps: ErrorPageProps = {
            ghUserInfo: null,
            message: '',
            mountPath: '/',
            path: '/',
            reqId: this.reqId, // defined since expose is false
            search: '',
            title: '500 Internal Server Error',
        };
        sinon.assert.calledOnce(this.render);
        sinon.assert.calledWith(this.render, __dirname, '500 Internal Server Error', ErrorPage, expectedProps);
        this.expectedCtx.status = 500;
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
    }

    @test
    async 'passes down mountPath'(): Promise<void> {
        Object.assign(this.ctx, { mountPath: 'foo' });
        const next = async () => { throw new Error(); };
        await middleware(this.ctx, next);
        const expectedProps: ErrorPageProps = {
            ghUserInfo: null,
            message: '',
            mountPath: 'foo',
            path: '/',
            reqId: this.reqId, // defined since expose is false
            search: '',
            title: '500 Internal Server Error',
        };
        sinon.assert.calledOnce(this.render);
        sinon.assert.calledWith(this.render, __dirname, '500 Internal Server Error', ErrorPage, expectedProps);
        Object.assign(this.expectedCtx, { status: 500, mountPath: 'foo' });
        assert.deepStrictEqual(this.ctx, this.expectedCtx);
    }
}

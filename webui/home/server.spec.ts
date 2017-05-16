import assert from 'assert';
import { suite, test } from 'mocha-typescript';
import sinon from 'sinon';
import { createUrlCtx } from '../../lib/koa-ctx/UrlCtx';
import { Home, HomeProps } from './entry';
import { Ctx, middleware } from './server';

@suite('webui/home')
export class MiddlewareTest {
    @test
    'requires ctx.render() to be specified'(done: () => void): void {
        const ctx: Ctx = createUrlCtx('GET', 'http://localhost');
        middleware(ctx).then(() => {
            assert(false, 'should not succeed');
        }, e => {
            assert(e instanceof TypeError);
            done();
        }).catch(done);
    }

    @test
    async 'only responds to /'(): Promise<void> {
        const render = sinon.spy();
        const ctx1: Ctx = Object.assign({
            auth: null,
            render,
        }, createUrlCtx('GET', 'http://localhost//'));
        const next = sinon.stub().resolves();

        // with next
        await middleware(ctx1, next);
        sinon.assert.notCalled(render);
        sinon.assert.calledOnce(next);

        // without next
        const ctx2: Ctx = Object.assign({
            auth: null,
            render,
        }, createUrlCtx('GET', 'http://localhost/./'));
        await middleware(ctx2);
        sinon.assert.notCalled(render);
    }

    @test
    async 'only responds to GET or HEAD'(): Promise<void> {
        const render = sinon.spy();
        const ctx1: Ctx = Object.assign({
            auth: null,
            render,
        }, createUrlCtx('POST', 'http://localhost/'));
        const next = sinon.stub().resolves();

        // with next
        await middleware(ctx1, next);
        sinon.assert.notCalled(render);
        sinon.assert.calledOnce(next);

        // without next
        const ctx2: Ctx = Object.assign({
            auth: null,
            render,
        }, createUrlCtx('PUT', 'http://localhost/'));
        await middleware(ctx2);
        sinon.assert.notCalled(render);
    }

    @test
    async 'renders Home component'(): Promise<void> {
        const render = sinon.spy();
        const ctx = Object.assign({
            auth: null,
            render,
        }, createUrlCtx('GET', 'http://localhost/'));
        await middleware(ctx);
        const expectedProps: HomeProps = {
            ghUserInfo: null,
            mountPath: '/',
            path: '/',
            search: '',
        };
        sinon.assert.calledOnce(render);
        sinon.assert.calledWith(render, __dirname, 'CanIHasReview', Home, expectedProps);
    }

    @test
    async 'responds to GET / with query string'(): Promise<void> {
        const render = sinon.spy();
        const ctx = Object.assign({
            auth: null,
            render,
        }, createUrlCtx('GET', 'http://localhost/?some=query&string'));
        await middleware(ctx);
        const expectedProps: HomeProps = {
            ghUserInfo: null,
            mountPath: '/',
            path: '/',
            search: '?some=query&string',
        };
        sinon.assert.calledOnce(render);
        sinon.assert.calledWith(render, __dirname, 'CanIHasReview', Home, expectedProps);
    }

    @test
    async 'passes down mountPath'(): Promise<void> {
        const render = sinon.spy();
        const ctx = Object.assign({
            auth: null,
            mountPath: 'foo',
            render,
        }, createUrlCtx('HEAD', 'http://localhost/'));
        await middleware(ctx);
        const expectedProps: HomeProps = {
            ghUserInfo: null,
            mountPath: 'foo',
            path: '/',
            search: '',
        };
        sinon.assert.calledOnce(render);
        sinon.assert.calledWith(render, __dirname, 'CanIHasReview', Home, expectedProps);
    }
}

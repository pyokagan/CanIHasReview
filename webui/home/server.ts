/**
 * @module
 * Home page.
 */
import assert from 'assert';
import { isUrlCtx, MountCtx, UrlCtx } from '../../lib/koa-ctx';
import { RenderCtx } from '../RenderCtx';
import { homeRoute } from '../routes';
import Home from './entry';

export interface Ctx extends
    UrlCtx,
    Partial<Readonly<RenderCtx>>,
    Partial<Readonly<MountCtx>> {}

export function isCtx(ctx: any): ctx is Ctx {
    return typeof ctx === 'object' &&
        isUrlCtx(ctx);
}

export async function middleware(ctx: Ctx, next?: () => Promise<void>): Promise<void> {
    assert(isCtx(ctx));
    if (!ctx.render) {
        throw new TypeError('ctx.render not provided');
    }

    if (!homeRoute.match(ctx, 'GET')) {
        if (next) {
            await next();
        }
        return;
    }

    ctx.render(__dirname, 'CanIHasReview', Home, {
        mountPath: ctx.mountPath || '/',
    });
}

export default middleware;

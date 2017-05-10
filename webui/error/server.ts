/**
 * @module
 * Error page to be displayed whenever there is an unhandled exception.
 */
import assert from 'assert';
import http from 'http';
import { HttpError } from 'http-errors';
import { MountCtx, ResponseCtx } from '../../lib/koa-ctx';
import { LoggerConsole, LoggerCtx } from '../../lib/koa-logger';
import { RenderCtx } from '../RenderCtx';
import ErrorPage from './entry';

export interface Ctx extends
    Partial<ResponseCtx>,
    Partial<Readonly<RenderCtx>>,
    Partial<Readonly<LoggerCtx>>,
    Partial<Readonly<MountCtx>> { }

export function isCtx(ctx: any): ctx is Ctx {
    return typeof ctx === 'object';
}

export async function middleware(ctx: Ctx, next?: () => Promise<void>): Promise<void> {
    assert(isCtx(ctx));
    if (!ctx.render) {
        throw new TypeError('ctx.render not provided');
    }

    if (!ctx.console) {
        throw new TypeError('ctx.console not provided');
    }
    if (!ctx.reqId) {
        throw new TypeError('ctx.reqId not provided');
    }

    try {
        if (next) {
            await next();
        }
    } catch (e) {
        logError(ctx.console, e);
        const status: number = e.status || 500;
        ctx.status = status;
        const expose = typeof e.expose === 'boolean' ? e.expose : status < 500;
        const title = `${status} ${http.STATUS_CODES[status] || 'Unknown Error'}`;
        const message: string = expose ? e.message : '';
        ctx.render(__dirname, title, ErrorPage, {
            message,
            mountPath: ctx.mountPath || '/',
            reqId: expose ? undefined : ctx.reqId,
            title,
        });
    }
}

function logError(console: LoggerConsole, err: any): void {
    if (!(err instanceof Error)) {
        console.error('webui/error: FATAL ERROR');
        console.error(`non-error thrown: ${err}`);
        return;
    }

    const obj: Partial<HttpError> = err;
    if (obj.expose) {
        return;
    }

    console.error('webui/error: FATAL ERROR');
    console.error(obj.stack || '');
}

export default middleware;

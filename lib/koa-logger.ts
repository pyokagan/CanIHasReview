/**
 * @module
 * Implements per-request logging for koa.
 */
import { Console } from 'console';
import { HttpError } from 'http-errors';
import Koa from 'koa';
import uuid from 'uuid';
import { LinePrefixTransform } from './stream-util';

export interface LoggerConsole {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

/**
 * Logging interface mixed in to the koa context.
 */
export interface LoggerCtx {
    console: LoggerConsole;
    /** Request ID. */
    reqId: string;
}

/**
 * Options to be passed to {@link createMiddleware}.
 */
export interface CreateMiddlewareOptions {
}

/**
 * Context to be passed into the middleware.
 */
export interface Ctx extends Koa.Context, Partial<LoggerCtx> {}

type Middleware = (ctx: Ctx, next?: () => Promise<void>) => Promise<void>;

/**
 * Create logging middleware.
 */
export function createMiddleware(opts: CreateMiddlewareOptions): Middleware {
    return async (ctx, next) => {
        const reqId = uuid.v1();

        const logStream = new LinePrefixTransform(`req-${reqId}: `);
        logStream.pipe(process.stderr);

        const console = new Console(logStream);
        console.log(`<-- ${ctx.method} ${ctx.originalUrl}`);

        const res = ctx.res;
        const onfinish = () => done('finish');
        const onclose = () => done('close');
        res.once('finish', onfinish);
        res.once('close', onclose);

        ctx.reqId = reqId;
        ctx.console = console;

        const start = Date.now();

        try {
            if (next) {
                await next();
            }
        } catch (err) {
            handleError(console, err);
            throw err;
        }

        function done(event: string): void {
            res.removeListener('finish', onfinish);
            res.removeListener('close', onclose);
            const symbol = event === 'finish' ? '-->' : '-x-';
            const delta = Date.now() - start;
            console.log(`${symbol} ${ctx.method} ${ctx.originalUrl} ${ctx.status} ${formatTime(delta)}`);
            logStream.end();
        }
    };
}

function formatTime(ms: number): string {
    return ms < 10000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`;
}

function handleError(console: LoggerConsole, err: any): void {
    if (!(err instanceof Error)) {
        console.error('koa-logger: FATAL ERROR');
        console.error(`non-error thrown: ${err}`);
        return;
    }

    const obj: Partial<HttpError> = err;
    if (obj.expose) {
        return;
    }

    console.error('koa-logger: FATAL ERROR');
    console.error(obj.stack || '');
}

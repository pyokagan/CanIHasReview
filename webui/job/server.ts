/**
 * @module
 * Job status monitoring.
 */
import createError from 'http-errors';
import isObjectLike from 'lodash/isObjectLike';
import { JobRunner, JobStatus } from '../../lib/job';
import { MountCtx, ResponseCtx, UrlCtx } from '../../lib/koa-ctx';
import AuthCtx from '../AuthCtx';
import { RenderCtx } from '../RenderCtx';
import { jobRoute } from '../routes';
import { JobPage } from './entry';

export interface Ctx extends
    UrlCtx,
    ResponseCtx,
    Partial<Readonly<AuthCtx>>,
    Partial<Readonly<RenderCtx>>,
    Partial<Readonly<MountCtx>> {}

interface Options {
    jobRunner: JobRunner<any>;
}

type Middleware = (ctx: Ctx, next?: () => Promise<void>) => Promise<void>;

export function createMiddleware(opts: Options): Middleware {
    return async (ctx, next) => {
        if (!ctx.render) {
            throw new TypeError('ctx.render not provided');
        }

        if (typeof ctx.auth === 'undefined') {
            throw new TypeError('ctx.auth not provided');
        }

        const routeProps = jobRoute.match(ctx, 'GET');
        if (!routeProps) {
            if (next) {
                await next();
            }
            return;
        }

        const jobStatus: JobStatus<any> | undefined =
            routeProps.name === 'test' ? ['running', undefined] : opts.jobRunner.getStatus(routeProps.name);
        if (!jobStatus) {
            throw createError(404);
        }

        const [ jobState, jobValue ] = jobStatus;
        let jobMessage: string | undefined;
        if (jobState === 'rejected' && isObjectLike(jobValue) &&
                typeof jobValue.message === 'string' && jobValue.expose) {
            jobMessage = jobValue.message;
        }

        if (typeof ctx.query['json'] === 'string') {
            ctx.body = [ jobState, jobMessage ];
        } else {
            ctx.render(__dirname, 'CanIHasReview', JobPage, {
                ghUserInfo: ctx.auth ? ctx.auth.ghUserInfo : null,
                jobMessage,
                jobName: routeProps.name,
                jobState,
                mountPath: ctx.mountPath || '/',
                path: ctx.path,
                search: ctx.search,
            });
        }
    };
}

export default createMiddleware;

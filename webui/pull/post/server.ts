/**
 * @module
 * Job status monitoring.
 */
import createError from 'http-errors';
import isEmpty from 'lodash/isEmpty';
import { repoConfigs } from '../../../config';
import * as github from '../../../lib/github';
import { JobRunner } from '../../../lib/job';
import { MountCtx, RedirectCtx, UrlCtx } from '../../../lib/koa-ctx';
import { makeNewVersionJob } from '../../../lib/newPrVersionJob';
import * as prcheck from '../../../lib/prcheck';
import AuthCtx from '../../AuthCtx';
import { jobRoute, pullRoute } from '../../routes';

export interface Ctx extends
    UrlCtx,
    RedirectCtx,
    Partial<Readonly<AuthCtx>>,
    Partial<Readonly<MountCtx>> {}

interface Options {
    jobRunner: JobRunner<any>;
    githubToken: string;
}

type Middleware = (ctx: Ctx, next?: () => Promise<void>) => Promise<void>;

export function createMiddleware(opts: Options): Middleware {
    return async (ctx, next) => {
        if (typeof ctx.auth === 'undefined') {
            throw new TypeError('ctx.auth not provided');
        }

        const routeProps = pullRoute.match(ctx, 'POST');
        if (!routeProps) {
            if (next) {
                await next();
            }
            return;
        }

        // User must be logged in.
        if (!ctx.auth) {
            throw createError(401);
        }

        const ghUserApi = github.adaptFetchCache(ctx.auth.ghUserApi);
        const prInfo = await github.getPrInfo(ghUserApi, routeProps.owner, routeProps.repo, routeProps.pr);

        if (!(prInfo.base.repo.full_name in repoConfigs)) {
            throw createError(404, 'Unsupported repo');
        }
        const repoConfig = repoConfigs[prInfo.base.repo.full_name];

        if (ctx.auth.ghUserInfo.id !== prInfo.user.id) {
            throw createError(403, 'Only the PR owner can submit new iterations');
        }

        const prChecks = repoConfig.checks ? prcheck.compose(repoConfig.checks) : prcheck.runDefaultChecks;
        const prCheckResult = await prChecks(ghUserApi, prInfo.base.user.login, prInfo.base.repo.name, prInfo.number);
        if (!isEmpty(prCheckResult)) {
            throw createError(403, 'One or more checks failed');
        }

        // Create and run job
        const job = makeNewVersionJob({
            githubToken: opts.githubToken,
            prInfo,
            repoConfig,
        });
        const jobName = opts.jobRunner.run(job);

        // Redirect users to the newly-created job.
        ctx.redirect(jobRoute.toPath({ name: jobName }, ctx.mountPath || '/'));
    };
}

export default createMiddleware;

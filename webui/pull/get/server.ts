/**
 * @module
 * PR view page.
 */
import createError from 'http-errors';
import { repoConfigs } from '../../../config';
import * as github from '../../../lib/github';
import { MountCtx, UrlCtx } from '../../../lib/koa-ctx';
import * as prcheck from '../../../lib/prcheck';
import AuthCtx from '../../AuthCtx';
import { RenderCtx } from '../../RenderCtx';
import { pullRoute } from '../../routes';
import PrGet from './entry';

export interface Ctx extends
    UrlCtx,
    Partial<Readonly<AuthCtx>>,
    Partial<Readonly<RenderCtx>>,
    Partial<Readonly<MountCtx>> {}

export async function middleware(ctx: Ctx, next?: () => Promise<void>): Promise<void> {
    if (!ctx.render) {
        throw new TypeError('ctx.render not provided');
    }
    if (typeof ctx.auth === 'undefined') {
        throw new TypeError('ctx.auth not provided');
    }
    if (!ctx.redirectToLogin) {
        throw new TypeError('ctx.redirectToLogin not provided');
    }

    const routeProps = pullRoute.match(ctx, 'GET');
    if (!routeProps) {
        if (next) {
            await next();
        }
        return;
    }

    if (!ctx.auth) {
        ctx.redirectToLogin();
        return;
    }

    const ghUserApi = github.adaptFetchCache(ctx.auth.ghUserApi);
    const prInfo = await github.getPrInfo(ghUserApi, routeProps.owner, routeProps.repo, routeProps.pr);

    if (!(prInfo.base.repo.full_name in repoConfigs)) {
        throw createError(404, 'Unsupported repo');
    }
    const repoConfig = repoConfigs[prInfo.base.repo.full_name];

    const prCommits = await github.getPrCommits(ghUserApi, routeProps.owner, routeProps.repo, routeProps.pr);
    const prChecks = repoConfig.checks ? prcheck.compose(repoConfig.checks) : prcheck.runDefaultChecks;
    const prCheckResult = await prChecks(ghUserApi, prInfo.base.user.login, prInfo.base.repo.name, prInfo.number);

    ctx.render(__dirname, 'CanIHasReview', PrGet, {
        ghUserInfo: ctx.auth ? ctx.auth.ghUserInfo : null,
        mountPath: ctx.mountPath || '/',
        path: ctx.path,
        prCheckResult,
        prCommits,
        prInfo,
        search: ctx.search,
    });
}

export default middleware;

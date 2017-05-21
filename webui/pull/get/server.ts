/**
 * @module
 * PR view page.
 */
import {
    repoConfigs,
} from '@config';
import * as github from '@lib/github';
import {
    HttpStatus,
    Request,
    Response,
} from '@lib/http';
import * as prcheck from '@lib/prcheck';
import {
    AuthContext,
} from '@webui/auth/server';
import renderServer from '@webui/renderServer';
import {
    pullRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import PrGet from './entry';

type Options = {
    req: Request;
    resp: Response;
    auth: AuthContext;
};

export async function handlePullGet(opts: Options): Promise<void> {
    const { req, resp, auth } = opts;

    const routeParams = pullRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw new Error(`bad request method: ${req.method}`);
    }

    const ghUserApi = github.adaptFetchCache(auth.ghUserApi);
    const prInfo = await github.getPrInfo(ghUserApi, routeParams.owner, routeParams.repo, routeParams.pr);

    if (!(prInfo.base.repo.full_name in repoConfigs)) {
        throw createHttpError(HttpStatus.NOT_FOUND, 'Unsupported repo');
    }
    const repoConfig = repoConfigs[prInfo.base.repo.full_name];

    const prCommits = await github.getPrCommits(ghUserApi, routeParams.owner, routeParams.repo, routeParams.pr);
    const prChecks = repoConfig.checks ? prcheck.compose(repoConfig.checks) : prcheck.runDefaultChecks;
    const prCheckResult = await prChecks(ghUserApi, prInfo.base.user.login, prInfo.base.repo.name, prInfo.number);

    renderServer(resp, __dirname, 'CanIHasReview', PrGet, {
        ghUserInfo: auth.ghUserInfo,
        mountPath: req.mountPath,
        pathname: req.pathname,
        prCheckResult,
        prCommits,
        prInfo,
        search: req.search,
    });
}

export default handlePullGet;

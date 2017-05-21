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

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handlePullGet(opts: Options): Promise<boolean> {
    const { req, resp, auth } = opts;

    const routeProps = pullRoute.match(req, 'GET');
    if (!routeProps) {
        return false;
    }

    const ghUserApi = github.adaptFetchCache(auth.ghUserApi);
    const prInfo = await github.getPrInfo(ghUserApi, routeProps.owner, routeProps.repo, routeProps.pr);

    if (!(prInfo.base.repo.full_name in repoConfigs)) {
        throw createHttpError(HttpStatus.NOT_FOUND, 'Unsupported repo');
    }
    const repoConfig = repoConfigs[prInfo.base.repo.full_name];

    const prCommits = await github.getPrCommits(ghUserApi, routeProps.owner, routeProps.repo, routeProps.pr);
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
    return true;
}

export default handlePullGet;

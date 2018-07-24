import { HttpStatus, Request, Response, setBodyJson } from '@lib/http';
import createHttpError from 'http-errors';
import { getGithubBranch, getRepoInfo, getRepoInstallation, GithubModel, hasBranch, hasRepo } from '../model';
import { reposBranchesRoute, reposInstallationRoute, reposRoute } from './routes';
import { requireAppAuth } from './util';

type HandleRepoRoutesOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
};

export async function handleRepoRoutes(opts: HandleRepoRoutesOptions): Promise<void> {
    const { req, resp, model } = opts;

    if (reposRoute.testPath(req.pathname)) {
        await handleRepos(req, resp, model);
    } else if (reposBranchesRoute.testPath(req.pathname)) {
        await handleGetBranch(req, resp, model);
    } else if (reposInstallationRoute.testPath(req.pathname)) {
        await handleInstallation(req, resp, model);
    } else {
        throw createHttpError(HttpStatus.NOT_FOUND);
    }
}

export default handleRepoRoutes;

async function handleRepos(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = reposRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    if (!(await hasRepo(model, routeParams.owner, routeParams.repo))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such repo: ${routeParams.owner}/${routeParams.repo}`);
    }

    const repo = await getRepoInfo(model, routeParams.owner, routeParams.repo);
    setBodyJson(resp, repo);
}

async function handleGetBranch(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = reposBranchesRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const { owner, repo, branch } = routeParams;

    if (!(await hasRepo(model, owner, repo))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such repo: ${owner}/${repo}`);
    }

    if (!(await hasBranch(model, owner, repo, branch))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such branch in ${owner}/${repo}: ${branch}`);
    }

    const githubBranch = await getGithubBranch(model, owner, repo, branch);
    setBodyJson(resp, githubBranch);
}

async function handleInstallation(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = reposInstallationRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const { owner, repo } = routeParams;
    const appId = await requireAppAuth(req, model);
    const installation = await getRepoInstallation(model, appId, owner, repo);
    if (!installation) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no installation found for appid ${appId} in ${owner}/${repo}`);
    }

    setBodyJson(resp, installation);
}

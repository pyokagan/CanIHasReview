import {
    HttpStatus,
    Request,
    Response,
    setBodyJson,
} from '@lib/http';
import createHttpError from 'http-errors';
import {
    addIssueComment,
    getIssueComments,
    getPrCommits,
    getPrInfo,
    GithubModel,
    hasIssue,
    hasRepo,
} from '../model';
import {
    issueCommentsRoute,
    prCommitsRoute,
    prInfoRoute,
} from './routes';
import {
    requireAuth,
} from './util';

type HandleIssueRoutesOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
};

export async function handleIssueRoutes(opts: HandleIssueRoutesOptions): Promise<void> {
    const { req, resp, model } = opts;

    if (prInfoRoute.testPath(req.pathname)) {
        await handleGetPrInfo(req, resp, model);
    } else if (prCommitsRoute.testPath(req.pathname)) {
        await handleGetPrCommits(req, resp, model);
    } else if (issueCommentsRoute.testPath(req.pathname)) {
        await handleIssueComments(req, resp, model);
    } else {
        throw createHttpError(HttpStatus.NOT_FOUND);
    }
}

export default handleIssueRoutes;

async function handleGetPrInfo(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = prInfoRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const { owner, repo, nr } = routeParams;
    const nrNumber = await doCommonProcessing(model, owner, repo, nr);
    const prInfo = await getPrInfo(model, owner, repo, nrNumber);
    setBodyJson(resp, prInfo);
}

async function handleGetPrCommits(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = prCommitsRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const { owner, repo, nr } = routeParams;
    const nrNumber = await doCommonProcessing(model, owner, repo, nr);
    const prCommits = await getPrCommits(model, owner, repo, nrNumber);
    setBodyJson(resp, prCommits);
}

async function handleIssueComments(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = issueCommentsRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    const { owner, repo, nr } = routeParams;
    const nrNumber = await doCommonProcessing(model, owner, repo, nr);

    if (req.method === 'GET' || req.method === 'HEAD') {
        const comments = await getIssueComments(model, owner, repo, nrNumber);
        setBodyJson(resp, comments);
    } else if (req.method === 'POST') {
        const reqBody = (await req.body()).toString('utf8');
        const reqBodyJson = JSON.parse(reqBody);
        if (reqBodyJson === null || typeof reqBodyJson !== 'object' || typeof reqBodyJson.body !== 'string') {
            throw createHttpError(HttpStatus.BAD_REQUEST, `invalid body: ${reqBody}`);
        }
        const authLogin = await requireAuth(req, model);
        const myResp = await addIssueComment(model, owner, repo, nrNumber, reqBodyJson.body, authLogin);
        setBodyJson(resp, myResp);
    } else {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }
}

async function doCommonProcessing(model: GithubModel, owner: string, repo: string, nr: string): Promise<number> {
    if (!(await hasRepo(model, owner, repo))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such repo: ${owner}/${repo}`);
    }
    if (!/^\d+$/.test(nr)) {
        throw createHttpError(HttpStatus.NOT_FOUND, `not a number: ${nr}`);
    }
    const nrNumber = parseInt(nr);
    if (!(await hasIssue(model, owner, repo, nrNumber))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such PR: ${nrNumber}`);
    }
    return nrNumber;
}

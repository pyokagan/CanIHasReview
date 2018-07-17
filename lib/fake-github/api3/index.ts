/**
 * @module
 * Re-implementation of GitHub's API v3
 */
import {
    HttpStatus,
    Request,
    Response,
    setBodyJson,
} from '@lib/http';
import {
    STATUS_CODES,
} from 'http';
import createHttpError from 'http-errors';
import {
    GithubModel,
} from '../model';
import handleIssueRoutes from './issues';
import {
    handleOauthAccessToken,
    OauthAccessTokenCallback,
} from './oauth';
import handleRepoRoutes from './repo';
import {
    issueRoutes,
    oauthAccessTokenRoute,
    repoRoutes,
    userRoutes,
} from './routes';
import handleUserRoutes from './user';

type MainOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
    genAccessToken?: OauthAccessTokenCallback;
};

export async function main(opts: MainOptions): Promise<void> {
    const { req, resp, model } = opts;

    try {
        let handled = true;

        if (userRoutes.some(route => route.testPath(req.pathname))) {
            await handleUserRoutes({
                model,
                req,
                resp,
            });
        } else if (oauthAccessTokenRoute.testPath(req.pathname)) {
            await handleOauthAccessToken({
                genAccessToken: opts.genAccessToken,
                model,
                req,
                resp,
            });
        } else if (repoRoutes.some(route => route.testPath(req.pathname))) {
            await handleRepoRoutes({
                model,
                req,
                resp,
            });
        } else if (issueRoutes.some(route => route.testPath(req.pathname))) {
            await handleIssueRoutes({
                model,
                req,
                resp,
            });
        } else {
            handled = false;
        }

        if (!handled) {
            throw createHttpError(HttpStatus.NOT_FOUND, `not found: ${req.pathname}${req.search}`);
        }
    } catch (e) {
        await handleError(req, resp, e);
    }
}

async function handleError(req: Request, resp: Response, e: any): Promise<void> {
    const status: HttpStatus = e.status || HttpStatus.INTERNAL_SERVER_ERROR;
    resp.status = status;
    const expose = typeof e.expose === 'boolean' ? e.expose : status < 500;
    if (!expose) {
        console.error(e);
    }
    const message: string = expose ? e.message : (STATUS_CODES[status] || 'Unknown Error');
    setBodyJson(resp, {
        documentation_url: 'https://developer.github.com/v3',
        message,
    });
}

export default main;

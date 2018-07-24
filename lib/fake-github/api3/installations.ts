import { HttpStatus, Request, Response, setBodyJson } from '@lib/http';
import createHttpError from 'http-errors';
import uuid from 'uuid';
import { createOauthToken, GithubModel, readApp } from '../model';
import { getUserLogin } from '../model/user';
import { installationsAccessTokensRoute } from './routes';
import { requireAppAuth } from './util';

type HandleInstallationsRoutesOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
};

export async function handleInstallationsRoutes(opts: HandleInstallationsRoutesOptions): Promise<void> {
    const { req, resp, model } = opts;

    if (installationsAccessTokensRoute.testPath(req.pathname)) {
        await handleAccessTokens(req, resp, model);
    } else {
        throw createHttpError(HttpStatus.NOT_FOUND);
    }
}

export default handleInstallationsRoutes;

async function handleAccessTokens(req: Request, resp: Response, model: GithubModel): Promise<void> {
    const routeParams = installationsAccessTokensRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'POST') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const appId = await requireAppAuth(req, model);
    const appInfo = await readApp(model, appId);

    const token = uuid.v1();
    await createOauthToken(model, token, appInfo.oauthclientid, await getUserLogin(model, appInfo.userid));
    setBodyJson(resp, { token });
}

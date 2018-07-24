import { HttpStatus, Request } from '@lib/http';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { getOauthToken, GithubModel, hasApp, hasOauthToken, readApp } from '../model';

export async function requireAuth(req: Request, model: GithubModel): Promise<string> {
    const authorization = req.headers.authorization;
    const tokenPrefix = 'token ';

    if (typeof authorization !== 'string' || !authorization.startsWith(tokenPrefix)) {
        throw createHttpError(HttpStatus.UNAUTHORIZED, 'Requires authentication');
    }
    const accessToken = authorization.substr(tokenPrefix.length);
    if (!(await hasOauthToken(model, accessToken))) {
        throw createHttpError(HttpStatus.UNAUTHORIZED, `Bad credentials: invalid access token: ${accessToken}`);
    }

    const oauthToken = await getOauthToken(model, accessToken);
    return oauthToken.login;
}

export async function requireAppAuth(req: Request, model: GithubModel): Promise<number> {
    const authorization = req.headers.authorization;
    const bearerPrefix = 'Bearer ';

    if (typeof authorization !== 'string' || !authorization.startsWith(bearerPrefix)) {
        throw createHttpError(HttpStatus.UNAUTHORIZED, 'Requires authentication');
    }
    const bearerToken = authorization.substr(bearerPrefix.length);
    const payload = jwt.decode(bearerToken);
    if (!payload || typeof payload !== 'object' || typeof payload.iss !== 'number') {
        throw createHttpError(HttpStatus.BAD_REQUEST, 'invalid bearer token payload');
    }
    const appId = payload.iss;
    if (!(await hasApp(model, appId))) {
        throw createHttpError(HttpStatus.BAD_REQUEST, `no such app: ${appId}`);
    }

    const app = await readApp(model, appId);
    const publicKey = app.publickey;
    jwt.verify(bearerToken, publicKey);
    return appId;
}

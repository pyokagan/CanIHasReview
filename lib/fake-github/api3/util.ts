import {
    HttpStatus, Request,
} from '@lib/http';
import createHttpError from 'http-errors';
import {
    getOauthToken,
    GithubModel,
    hasOauthToken,
} from '../model';

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

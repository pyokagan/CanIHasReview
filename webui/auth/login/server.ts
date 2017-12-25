/**
 * @module
 * (Node-only) Auth -- Login route handling
 */
import {
    HttpStatus,
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import {
    authLoginRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import simpleOauth2 from 'simple-oauth2';
import {
    getLoginCallbackUrl,
} from '../paths';

type Options = {
    req: Request;
    resp: Response;
    oauth2: simpleOauth2.OAuthClient;
    scope: string;
};

export async function handleLogin(opts: Options): Promise<void> {
    const { req, resp, oauth2, scope } = opts;

    const routeParams = authLoginRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const authorizationUrl = oauth2.authorizationCode.authorizeURL({
        redirect_uri: getLoginCallbackUrl({
            host: req.host,
            mountPath: req.mountPath,
            protocol: req.protocol,
            redirect: routeParams.redirect,
        }),
        scope,
    });
    redirectSeeOther(resp, authorizationUrl);
}

export default handleLogin;

/**
 * @module
 * (Node-only) Auth -- Login route handling
 */
import {
    getAuthorizationUrl,
} from '@lib/github';
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
import {
    getLoginCallbackUrl,
} from '../paths';

type Options = {
    req: Request;
    resp: Response;
    githubClientId: string;
};

export async function handleLogin(opts: Options): Promise<void> {
    const { req, resp } = opts;

    const routeParams = authLoginRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const authorizationUrl = getAuthorizationUrl({
        clientId: opts.githubClientId,
        redirectUri: getLoginCallbackUrl({
            host: req.host,
            mountPath: req.mountPath,
            protocol: req.protocol,
            redirect: routeParams.redirect,
        }),
    });

    redirectSeeOther(resp, authorizationUrl);
}

export default handleLogin;

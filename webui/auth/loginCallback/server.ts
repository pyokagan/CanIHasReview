/**
 * @module
 * (Node-only) Auth -- Login callback route handling
 */
import {
    HttpStatus,
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import {
    homeRoute,
} from '@webui/routes';
import {
    authLoginCallbackRoute,
} from '@webui/routes';
import Session from '@webui/session';
import createHttpError from 'http-errors';
import {
    posix as posixPath,
} from 'path';
import simpleOauth2 from 'simple-oauth2';
import url from 'url';
import {
    getLoginCallbackUrl,
} from '../paths';

type Options = {
    req: Request,
    resp: Response,
    oauth2: simpleOauth2.OAuthClient;
    session: Session,
};

export async function handleLoginCallback(opts: Options): Promise<void> {
    const { req, resp, oauth2, session } = opts;

    const routeParams = authLoginCallbackRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const code = routeParams.code;
    if (!code) {
        throw createHttpError(HttpStatus.BAD_REQUEST, 'code not provided');
    }

    const token = await oauth2.authorizationCode.getToken({
        code,
        redirect_uri: getLoginCallbackUrl({
            host: req.host,
            mountPath: req.mountPath,
            protocol: req.protocol,
            redirect: routeParams.redirect,
        }),
    });
    if (!token.access_token) {
        throw createHttpError(HttpStatus.BAD_REQUEST, token.error_description || 'Unknown Error');
    }
    session.ghToken = token.access_token;
    redirectSeeOther(resp, getFinalRedirect(req.mountPath, routeParams.redirect));
}

function getFinalRedirect(mountPath: string, redirect: string | undefined): string {
    if (!redirect) {
        return homeRoute.toPath({}, mountPath);
    }
    const comp = url.parse(redirect);
    if (comp.protocol || comp.host || !comp.path || !comp.path.startsWith('/')) {
        return homeRoute.toPath({}, mountPath);
    }
    return posixPath.join(mountPath, comp.path);
}

export default handleLoginCallback;

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
import {
    loginCallbackRoute,
} from '../routes';

type Options = {
    req: Request,
    resp: Response,
    oauth2: simpleOauth2.OAuthClient;
    session: Session,
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handleLoginCallback(opts: Options): Promise<boolean> {
    const { req, resp, oauth2, session } = opts;

    if (!loginCallbackRoute.match(req, 'GET')) {
        return false;
    }

    const code = req.query.get('code');
    if (!code) {
        throw createHttpError(HttpStatus.BAD_REQUEST, 'code not provided', { expose: true });
    }

    const redirect = req.query.get('redirect');
    const token = await oauth2.authorizationCode.getToken({
        code,
        redirect_uri: getLoginCallbackUrl({
            host: req.host,
            mountPath: req.mountPath,
            protocol: req.protocol,
            redirect,
        }),
    });
    if (!token.access_token) {
        throw createHttpError(HttpStatus.BAD_REQUEST, token.error_description || 'Unknown Error');
    }
    session.ghToken = token.access_token;
    redirectSeeOther(resp, getFinalRedirect(req.mountPath, redirect));

    return true;
}

function getFinalRedirect(mountPath: string, redirect?: string): string {
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

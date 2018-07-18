/**
 * @module
 * (Node-only) Auth -- Login callback route handling
 */
import {
    exchangeToken,
} from '@lib/github';
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
import fetchPonyfill from 'fetch-ponyfill';
import createHttpError from 'http-errors';
import {
    posix as posixPath,
} from 'path';
import url from 'url';
import {
    getLoginCallbackUrl,
} from '../paths';

const { fetch } = fetchPonyfill();

type Options = {
    req: Request,
    resp: Response,
    session: Session,
    githubClientId: string,
    githubClientSecret: string,
};

export async function handleLoginCallback(opts: Options): Promise<void> {
    const { req, resp, session } = opts;

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

    const token = await exchangeToken({
        clientId: opts.githubClientId,
        clientSecret: opts.githubClientSecret,
        code,
        fetch,
        redirectUri: getLoginCallbackUrl({
            host: req.host,
            mountPath: req.mountPath,
            protocol: req.protocol,
            redirect: routeParams.redirect,
        }),
    });

    session.ghToken = token;
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

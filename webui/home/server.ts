/**
 * @module
 * Home page.
 */
import {
    HttpStatus,
    Request,
    Response,
} from '@lib/http';
import {
    AuthContext,
} from '@webui/auth/server';
import renderServer from '@webui/renderServer';
import {
    homeRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import Home from './entry';

type Options = {
    req: Request;
    resp: Response;
    auth?: AuthContext;
};

export async function handleHome(opts: Options): Promise<void> {
    const { req, resp } = opts;

    const routeParams = homeRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    renderServer(resp, __dirname, 'CanIHasReview', Home, {
        ghUserInfo: opts.auth ? opts.auth.ghUserInfo : null,
        mountPath: req.mountPath,
        pathname: req.pathname,
        search: req.search,
    });
}

export default handleHome;

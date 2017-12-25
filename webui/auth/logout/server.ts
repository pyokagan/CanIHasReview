/**
 * @module
 * (Node-only) Auth -- Logout route handling
 */
import {
    HttpStatus,
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import {
    authLogoutRoute,
    homeRoute,
} from '@webui/routes';
import Session from '@webui/session';
import createHttpError from 'http-errors';

type Options = {
    req: Request;
    resp: Response;
    session: Session;
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handleLogout(opts: Options): Promise<void> {
    const { req, session, resp } = opts;

    const routeParams = authLogoutRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    delete session.ghToken;
    redirectSeeOther(resp, homeRoute.toPath({}, req.mountPath));
}

export default handleLogout;

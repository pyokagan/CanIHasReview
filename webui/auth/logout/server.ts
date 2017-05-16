/**
 * @module
 * (Node-only) Auth -- Logout route handling
 */
import {
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import {
    homeRoute,
} from '@webui/routes';
import Session from '@webui/session';
import {
    logoutRoute,
} from '../routes';

type Options = {
    req: Request;
    resp: Response;
    session: Session;
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handleLogout(opts: Options): Promise<boolean> {
    const { req, session, resp } = opts;

    if (!logoutRoute.match(req, 'GET')) {
        return false;
    }

    delete session.ghToken;
    redirectSeeOther(resp, homeRoute.toPath({}, req.mountPath));

    return true;
}

export default handleLogout;

/**
 * @module
 * Home page.
 */
import {
    Request,
    Response,
} from '@lib/http';
import {
    AuthContext,
} from '@webui/auth/server';
import renderServer from '@webui/renderServer';
import {
    homeRoute,
} from '../routes';
import Home from './entry';

type Options = {
    req: Request;
    resp: Response;
    auth?: AuthContext;
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handleHome(opts: Options): Promise<boolean> {
    const { req, resp } = opts;

    if (!homeRoute.match(req, 'GET')) {
        return false;
    }

    renderServer(resp, __dirname, 'CanIHasReview', Home, {
        ghUserInfo: opts.auth ? opts.auth.ghUserInfo : null,
        mountPath: req.mountPath,
        pathname: req.pathname,
        search: req.search,
    });
    return true;
}

export default handleHome;

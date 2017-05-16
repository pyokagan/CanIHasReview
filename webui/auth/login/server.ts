/**
 * @module
 * (Node-only) Auth -- Login route handling
 */
import {
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import simpleOauth2 from 'simple-oauth2';
import {
    getLoginCallbackUrl,
} from '../paths';
import {
    loginRoute,
} from '../routes';

type Options = {
    req: Request;
    resp: Response;
    oauth2: simpleOauth2.OAuthClient;
    scope: string;
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handleLogin(opts: Options): Promise<boolean> {
    const { req, resp, oauth2, scope } = opts;

    if (!loginRoute.match(req, 'GET')) {
        return false;
    }

    const redirect = req.query.get('redirect');
    const authorizationUrl = oauth2.authorizationCode.authorizeURL({
        redirect_uri: getLoginCallbackUrl({
            host: req.host,
            mountPath: req.mountPath,
            protocol: req.protocol,
            redirect,
        }),
        scope,
    });
    redirectSeeOther(resp, authorizationUrl);
    return true;
}

export default handleLogin;

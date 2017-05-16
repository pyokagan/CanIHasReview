/**
 * @module
 * (Node-only) GitHub authentication.
 */
import {
    Fetch,
    getAuthenticatedUserInfo,
    makeGhApi,
    PublicUserInfo,
    ServerError as GithubServerError,
} from '@lib/github';
import {
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import Session from '@webui/session';
import fetchPonyfill from 'fetch-ponyfill';
import simpleOauth2 from 'simple-oauth2';
import handleLogin from './login/server';
import handleLoginCallback from './loginCallback/server';
import handleLogout from './logout/server';
import {
    getLoginPath,
} from './paths';

const { fetch } = fetchPonyfill();

/**
 * User Agent to be reported to GitHub.
 */
const USER_AGENT = 'CanIHasReview';

export interface AuthContext {
    ghUserApi: Fetch;
    ghUserInfo: PublicUserInfo;
}

type Options = {
    req: Request;
    resp: Response;
    session: Session;
    githubClientId: string;
    githubClientSecret: string;
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handleAuthRoutes(opts: Options): Promise<boolean> {
    const oauth2 = simpleOauth2.create({
        auth: {
            authorizePath: '/login/oauth/authorize',
            tokenHost: 'https://github.com',
            tokenPath: '/login/oauth/access_token',
        },
        client: {
            id: opts.githubClientId,
            secret: opts.githubClientSecret,
        },
    });
    let handled = false;

    handled = await handleLogin({
        oauth2,
        req: opts.req,
        resp: opts.resp,
        scope: '',
    });
    if (handled) {
        return true;
    }

    handled = await handleLoginCallback({
        oauth2,
        req: opts.req,
        resp: opts.resp,
        session: opts.session,
    });
    if (handled) {
        return true;
    }

    handled = await handleLogout({
        req: opts.req,
        resp: opts.resp,
        session: opts.session,
    });
    if (handled) {
        return true;
    }

    return false;
}

export async function makeAuthContext(session: Session): Promise<AuthContext | undefined> {
    const ghToken = session.ghToken;
    if (!ghToken) {
        return;
    }

    const ghUserApi = makeGhApi({
        fetch,
        token: ghToken,
        userAgent: USER_AGENT,
    });

    let ghUserInfo: PublicUserInfo;
    try {
        ghUserInfo = await getAuthenticatedUserInfo(ghUserApi);
    } catch (e) {
        if (!(e instanceof GithubServerError) || e.status !== 403) {
            throw e;
        }
        // github returned 403, which means either the token expired or was revoked.
        // so, clear our token.
        delete session.ghToken;
        return;
    }

    return {
        ghUserApi,
        ghUserInfo,
    };
}

export function redirectToLogin(resp: Response, req: Request): void {
    redirectSeeOther(resp, getLoginPath({
        mountPath: req.mountPath,
        pathname: req.pathname,
        search: req.search,
    }));
}
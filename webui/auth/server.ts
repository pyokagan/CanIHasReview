/**
 * @module
 * (Node-only) GitHub authentication.
 */
import {
    createAccessTokenApi as createGhApi,
    Fetch,
    getAuthenticatedUserInfo,
    PublicUserInfo,
    ServerError as GithubServerError,
} from '@lib/github';
import {
    HttpStatus,
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import {
    authLoginCallbackRoute,
    authLoginRoute,
    authLogoutRoute,
} from '@webui/routes';
import Session from '@webui/session';
import createHttpError from 'http-errors';
import handleLogin from './login/server';
import handleLoginCallback from './loginCallback/server';
import handleLogout from './logout/server';

/**
 * User Agent to be reported to GitHub.
 */
const USER_AGENT = 'CanIHasReview';

export interface AuthContext {
    ghUserApi: Fetch;
    ghUserInfo: PublicUserInfo;
}

type Options = {
    fetch: Fetch;
    req: Request;
    resp: Response;
    session: Session;
    githubClientId: string;
    githubClientSecret: string;
};

export async function handleAuthRoutes(opts: Options): Promise<void> {
    const { req } = opts;

    if (authLoginRoute.testPath(req.pathname)) {
        await handleLogin({
            githubClientId: opts.githubClientId,
            req: opts.req,
            resp: opts.resp,
        });
    } else if (authLoginCallbackRoute.testPath(req.pathname)) {
        await handleLoginCallback({
            fetch: opts.fetch,
            githubClientId: opts.githubClientId,
            githubClientSecret: opts.githubClientSecret,
            req: opts.req,
            resp: opts.resp,
            session: opts.session,
        });
    } else if (authLogoutRoute.testPath(req.pathname)) {
        await handleLogout({
            req: opts.req,
            resp: opts.resp,
            session: opts.session,
        });
    } else {
        throw createHttpError(HttpStatus.NOT_FOUND);
    }
}

export async function makeAuthContext(session: Session, fetch: Fetch): Promise<AuthContext | undefined> {
    const ghToken = session.ghToken;
    if (!ghToken) {
        return;
    }

    const ghUserApi = createGhApi({
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
    redirectSeeOther(resp, authLoginRoute.toPath({
        redirect: `${req.pathname}${req.search}`,
    }, req.mountPath));
}

export default handleAuthRoutes;

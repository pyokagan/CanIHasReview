import fetchPonyfill from 'fetch-ponyfill';
import { getAuthenticatedUserInfo, makeGhApi, ServerError as GithubServerError } from '../../../lib/github';
import { MountCtx, RedirectCtx, SessionCtx, UrlCtx } from '../../../lib/koa-ctx';
import AuthCtx from '../../AuthCtx';
import AuthSession from '../AuthSession';
import { getLoginPath } from '../paths';

const { fetch } = fetchPonyfill();

/**
 * User Agent to be reported to GitHub.
 */
const USER_AGENT = 'CanIHasReview';

/**
 * Context to be passed to {@link middleware}.
 */
export interface Ctx extends
    RedirectCtx,
    UrlCtx,
    Partial<MountCtx>,
    Partial<SessionCtx>,
    Partial<AuthCtx> {}

/**
 * Middleware which will mix-in {@link AuthCtx}.
 */
export async function middleware(ctx: Ctx, next?: () => Promise<void>): Promise<void> {
    const session: AuthSession | undefined | null = ctx.session;
    if (!session) {
        throw new TypeError('ctx.session not provided');
    }

    const { path, search, mountPath } = ctx;
    ctx.redirectToLogin = () => {
        ctx.redirect(getLoginPath({
            mountPath: mountPath || '/',
            path,
            search,
        }));
    };

    if (session.ghToken) {
        try {
            const ghUserApi = makeGhApi({
                    fetch,
                    token: session.ghToken,
                    userAgent: USER_AGENT,
            });
            ctx.auth = {
                ghUserApi,
                ghUserInfo: await getAuthenticatedUserInfo(ghUserApi),
            };
        } catch (e) {
            if (!(e instanceof GithubServerError) || e.status !== 403) {
                throw e;
            }
            // github returned 403, which means either the token expired or was revoked.
            // so, clear our token.
            session.ghToken = undefined;
        }
    }

    if (!session.ghToken) {
        ctx.auth = null;
    }

    if (next) {
        await next();
    }
}

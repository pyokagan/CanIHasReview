import { Fetch, PublicUserInfo } from '../lib/github';

/**
 * Authentication status context mixin.
 * (Mixed in by the middleware created by {@link createMiddleware})
 */
export interface AuthCtx {
    /**
     * `null` if the user is not logged in.
     */
    auth: {
        /**
         * github API Fetch function which is authorized with the user's GitHub token.
         */
        ghUserApi: Fetch;

        /**
         * The logger-in user's GitHub info.
         */
        ghUserInfo: PublicUserInfo;
    } | null;

    /**
     * Redirects to login.
     */
    redirectToLogin(): void;
}

export default AuthCtx;

/**
 * Auth subsystem session interface.
 */
export interface AuthSession {
    /**
     * GitHub authorization token, if user is logged in.
     */
    ghToken?: string;
}

export default AuthSession;

/**
 * @module
 * WebUI session management.
 */
import {
    getCookie,
    Request,
    Response,
    setCookie,
} from '@lib/http';
import jwt from 'jsonwebtoken';

const cookieName = 'CIHRTOKEN';

/**
 * Session data.
 */
export interface Session {
    /**
     * GitHub authorization token, if user is logged in.
     */
    ghToken?: string;
}

export default Session;

type GetSessionOptions = {
    secret: string;
};

export function getSession(req: Request, options: GetSessionOptions): Session | undefined {
    const jwtToken = getCookie(req, cookieName);
    if (!jwtToken) {
        return;
    }
    try {
        const decodedToken = jwt.verify(jwtToken, options.secret, {
            algorithms: ['HS256'],
        });
        if (typeof decodedToken !== 'object' || decodedToken === null) {
            return;
        }
        const tok: Partial<Session> = decodedToken;
        return {
            ghToken: tok.ghToken,
        };
    } catch (e) {
        return;
    }
}

type SetSessionOptions = {
    secret: string;
    secure?: boolean;
};

export function setSession(resp: Response, sess: Session, options: SetSessionOptions): void {
    const jwtToken = jwt.sign(sess, options.secret, {
        algorithm: 'HS256',
        expiresIn: 30 * 60,
    });
    setCookie(resp, cookieName, jwtToken, {
        httpOnly: true,
        maxAge: 30 * 60 * 1000,
        path: '/',
        sameSite: true,
        secure: options.secure || false,
    });
}

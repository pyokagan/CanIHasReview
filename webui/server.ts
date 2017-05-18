/**
 * @module
 * HTML user interface.
 */
import {
    HttpStatus,
    Request,
    Response,
    setHeader,
} from '@lib/http';
import {
    authRoutes,
    homeRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import {
    handleAuthRoutes,
    makeAuthContext,
} from './auth/server';
import handleError from './error/server';
import handleHome from './home/server';
import {
    getSession,
    Session,
    setSession,
} from './session';

type Options = {
    sessionSecret: string;
    secure?: boolean;
    githubClientId: string;
    githubClientSecret: string;
};

/**
 * WebUI main entry point.
 */
export async function main(req: Request, resp: Response, options: Options): Promise<void> {
    setHeader(resp, 'Cache-Control', 'no-cache, no-store, must-revalidate');

    const session: Session = getSession(req, {
        secret: options.sessionSecret,
    }) || {};
    req.console.log(`Session data: ${JSON.stringify(session, null, 2)}`);

    const auth = await makeAuthContext(session);

    try {
        let handled = true;

        if (homeRoute.testPath(req.pathname)) {
            await handleHome({
                auth,
                req,
                resp,
            });
        } else if (authRoutes.some(route => route.testPath(req.pathname))) {
            await handleAuthRoutes({
                githubClientId: options.githubClientId,
                githubClientSecret: options.githubClientSecret,
                req,
                resp,
                session,
            });
        } else {
            handled = false;
        }

        setSession(resp, session, {
            secret: options.sessionSecret,
            secure: options.secure,
        });

        if (!handled) {
            throw createHttpError(HttpStatus.NOT_FOUND);
        }
    } catch (e) {
        await handleError({
            auth,
            e,
            req,
            resp,
        });
    }
}

export default main;
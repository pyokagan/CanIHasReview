/**
 * @module
 * HTML user interface.
 */
import {
    Fetch,
} from '@lib/fetch';
import {
    HttpStatus,
    Request,
    Response,
    setHeader,
} from '@lib/http';
import {
    JobRunner,
} from '@lib/job';
import {
    authRoutes,
    homeRoute,
    jobRoute,
    pullRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import {
    handleAuthRoutes,
    makeAuthContext,
} from './auth/server';
import handleError from './error/server';
import handleHome from './home/server';
import handleJob from './job/server';
import handlePull from './pull/server';
import {
    getSession,
    Session,
    setSession,
} from './session';

type Options = {
    fetch: Fetch;
    req: Request;
    resp: Response;
    sessionSecret: string;
    secure?: boolean;
    githubClientId: string;
    githubClientSecret: string;
    githubAppId: number;
    githubAppPrivateKey: string;
    jobRunner: JobRunner<any>;
};

/**
 * WebUI main entry point.
 */
export async function main(options: Options): Promise<void> {
    const { req, resp, fetch } = options;
    setHeader(resp, 'Cache-Control', 'no-cache, no-store, must-revalidate');

    const session: Session = getSession(req, {
        secret: options.sessionSecret,
    }) || {};
    req.console.log(`Session data: ${JSON.stringify(session, null, 2)}`);

    const auth = await makeAuthContext(session, fetch);

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
                fetch,
                githubClientId: options.githubClientId,
                githubClientSecret: options.githubClientSecret,
                req,
                resp,
                session,
            });
        } else if (jobRoute.testPath(req.pathname)) {
            await handleJob({
                auth,
                jobRunner: options.jobRunner,
                req,
                resp,
            });
        } else if (pullRoute.testPath(req.pathname)) {
            await handlePull({
                auth,
                fetch,
                githubAppId: options.githubAppId,
                githubAppPrivateKey: options.githubAppPrivateKey,
                jobRunner: options.jobRunner,
                req,
                resp,
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

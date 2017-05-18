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
    JobRunner,
} from '@lib/job';
import createHttpError from 'http-errors';
import {
    AuthContext,
    handleAuthRoutes,
    makeAuthContext,
} from './auth/server';
import handleError from './error/server';
import handleHome from './home/server';
import handleJob from './job/server';
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
    jobRunner: JobRunner<any>;
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
        const handled = await handleRoutes({
            auth,
            githubClientId: options.githubClientId,
            githubClientSecret: options.githubClientSecret,
            jobRunner: options.jobRunner,
            req,
            resp,
            session,
        });

        setSession(resp, session, {
            secret: options.sessionSecret,
            secure: options.secure,
        });

        if (!handled) {
            throw createHttpError(HttpStatus.NOT_FOUND);
        }
    } catch (e) {
        await handleError({
            e,
            req,
            resp,
        });
    }
}

type RouteOptions = {
    req: Request;
    resp: Response;
    session: Session;
    auth: AuthContext | undefined;
    githubClientId: string;
    githubClientSecret: string;
    jobRunner: JobRunner<any>;
};

async function handleRoutes(opts: RouteOptions): Promise<boolean> {
    let handled = false;

    handled = await handleHome({
        auth: opts.auth,
        req: opts.req,
        resp: opts.resp,
    });
    if (handled) {
        return true;
    }

    handled = await handleAuthRoutes({
        githubClientId: opts.githubClientId,
        githubClientSecret: opts.githubClientSecret,
        req: opts.req,
        resp: opts.resp,
        session: opts.session,
    });
    if (handled) {
        return true;
    }

    handled = await handleJob({
        auth: opts.auth,
        jobRunner: opts.jobRunner,
        req: opts.req,
        resp: opts.resp,
    });
    if (handled) {
        return true;
    }

    return false;
}

export default main;

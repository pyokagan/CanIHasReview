/**
 * @module
 */
import {
    HttpStatus,
    Request,
    Response,
} from '@lib/http';
import {
    JobRunner,
} from '@lib/job';
import {
    AuthContext,
    redirectToLogin,
} from '@webui/auth/server';
import {
    pullRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import * as Get from './get/server';
import * as Post from './post/server';

interface Options {
    req: Request;
    resp: Response;
    jobRunner: JobRunner<any>;
    githubToken: string;
    auth: AuthContext | undefined;
}

export async function handlePull(opts: Options): Promise<void> {
    const { resp, req, auth } = opts;

    if (!pullRoute.testPath(req.pathname, req.search)) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (!auth) {
        redirectToLogin(resp, req);
        return;
    }

    switch (req.method) {
    case 'GET':
    case 'HEAD':
        await Get.handlePullGet({
            auth,
            req,
            resp,
        });
        break;
    case 'POST':
        await Post.handlePullPost({
            auth,
            githubToken: opts.githubToken,
            jobRunner: opts.jobRunner,
            req,
            resp,
        });
        break;
    default:
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }
}

export default handlePull;

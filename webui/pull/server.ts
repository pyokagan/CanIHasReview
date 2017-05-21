/**
 * @module
 */
import {
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
import * as Get from './get/server';
import * as Post from './post/server';

interface Options {
    req: Request;
    resp: Response;
    jobRunner: JobRunner<any>;
    githubToken: string;
    auth: AuthContext | undefined;
}

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handlePull(opts: Options): Promise<boolean> {
    const { resp, req } = opts;
    let handled = false;

    if (!opts.auth) {
        redirectToLogin(resp, req);
        return true;
    }

    handled = await Get.handlePullGet({
        auth: opts.auth,
        req,
        resp,
    });
    if (handled) {
        return true;
    }

    handled = await Post.handlePullPost({
        auth: opts.auth,
        githubToken: opts.githubToken,
        jobRunner: opts.jobRunner,
        req,
        resp,
    });
    if (handled) {
        return true;
    }

    return false;
}

export default handlePull;

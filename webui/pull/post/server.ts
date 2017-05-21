/**
 * @module
 * Job status monitoring.
 */
import {
    repoConfigs,
} from '@config';
import * as github from '@lib/github';
import {
    HttpStatus,
    redirectSeeOther,
    Request,
    Response,
} from '@lib/http';
import {
    JobRunner,
} from '@lib/job';
import {
    makeNewVersionJob,
} from '@lib/newPrVersionJob';
import * as prcheck from '@lib/prcheck';
import {
    AuthContext,
} from '@webui/auth/server';
import {
    jobRoute,
    pullRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import isEmpty from 'lodash/isEmpty';

type Options = {
    req: Request;
    resp: Response;
    auth: AuthContext;
    jobRunner: JobRunner<any>;
    githubToken: string;
};

/**
 * @returns true if the request was handled, false otherwise.
 */
export async function handlePullPost(opts: Options): Promise<boolean> {
    const { req, resp, auth } = opts;

    const routeProps = pullRoute.match(req, 'POST');
    if (!routeProps) {
        return false;
    }

    const ghUserApi = github.adaptFetchCache(auth.ghUserApi);
    const prInfo = await github.getPrInfo(ghUserApi, routeProps.owner, routeProps.repo, routeProps.pr);

    if (!(prInfo.base.repo.full_name in repoConfigs)) {
        throw createHttpError(HttpStatus.NOT_FOUND, 'Unsupported repo');
    }
    const repoConfig = repoConfigs[prInfo.base.repo.full_name];

    if (auth.ghUserInfo.id !== prInfo.user.id) {
        throw createHttpError(HttpStatus.FORBIDDEN, 'Only the PR owner can submit new iterations');
    }

    const prChecks = repoConfig.checks ? prcheck.compose(repoConfig.checks) : prcheck.runDefaultChecks;
    const prCheckResult = await prChecks(ghUserApi, prInfo.base.user.login, prInfo.base.repo.name, prInfo.number);
    if (!isEmpty(prCheckResult)) {
        throw createHttpError(HttpStatus.FORBIDDEN, 'One or more checks failed');
    }

    // Create and run job
    const job = makeNewVersionJob({
        githubToken: opts.githubToken,
        prInfo,
        repoConfig,
    });
    const jobName = opts.jobRunner.run(job);

    // Redirect users to the newly-created job.
    redirectSeeOther(resp, jobRoute.toPath({ name: jobName }, req.mountPath));
    return true;
}

export default handlePullPost;

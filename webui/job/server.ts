/**
 * @module
 * (Node-only) Job status monitoring.
 */
import {
    HttpStatus,
    Request,
    Response,
    setBodyJson,
} from '@lib/http';
import {
    JobRunner,
    JobStatus,
} from '@lib/job';
import {
    AuthContext,
} from '@webui/auth/server';
import renderServer from '@webui/renderServer';
import {
    jobRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import {
    isObjectLike,
} from 'lodash';
import JobPage from './entry';

interface Options {
    jobRunner: JobRunner<any>;
    req: Request;
    resp: Response;
    auth: AuthContext | undefined;
}

export async function handleJob(opts: Options): Promise<void> {
    const { req, resp } = opts;

    const routeParams = jobRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const jobStatus: JobStatus<any> | undefined =
        routeParams.name === 'test' ? ['running', undefined] : opts.jobRunner.getStatus(routeParams.name);
    if (!jobStatus) {
        throw createHttpError(HttpStatus.NOT_FOUND, `No such job: ${routeParams.name}`);
    }

    const [ jobState, jobValue ] = jobStatus;
    let jobMessage: string | undefined;
    if (jobState === 'rejected' && isObjectLike(jobValue) &&
            typeof jobValue.message === 'string' && jobValue.expose) {
        jobMessage = jobValue.message;
    }

    if (req.search === '?json') {
        setBodyJson(resp, [jobState, jobMessage]);
    } else {
        renderServer(resp, __dirname, 'CanIHasReview', JobPage, {
            ghUserInfo: opts.auth ? opts.auth.ghUserInfo : null,
            jobMessage,
            jobName: routeParams.name,
            jobState,
            mountPath: req.mountPath,
            pathname: req.pathname,
            search: req.search,
        });
    }
}

export default handleJob;

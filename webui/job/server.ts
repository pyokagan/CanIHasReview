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
import createHttpError from 'http-errors';
import {
    isObjectLike,
} from 'lodash';
import {
    jobRoute,
} from '../routes';
import JobPage from './entry';

interface Options {
    jobRunner: JobRunner<any>;
    req: Request;
    resp: Response;
    auth: AuthContext | undefined;
}

/**
 * Returns true if the request was handled, false otherwise.
 */
export async function handleJob(opts: Options): Promise<boolean> {
    const { req, resp } = opts;

    const routeProps = jobRoute.match(req, 'GET');
    if (!routeProps) {
        return false;
    }

    const jobStatus: JobStatus<any> | undefined =
        routeProps.name === 'test' ? ['running', undefined] : opts.jobRunner.getStatus(routeProps.name);
    if (!jobStatus) {
        throw createHttpError(HttpStatus.NOT_FOUND, `No such job: ${routeProps.name}`);
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
            jobName: routeProps.name,
            jobState,
            mountPath: req.mountPath,
            pathname: req.pathname,
            search: req.search,
        });
    }

    return true;
}

export default handleJob;

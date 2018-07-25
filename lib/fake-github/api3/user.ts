import {
    HttpStatus,
    Request,
    Response,
    setBodyJson,
} from '@lib/http';
import createHttpError from 'http-errors';
import {
    getPublicUserInfo,
    GithubModel,
    hasUser,
} from '../model';
import {
    userRoute,
    usersRoute,
} from './routes';
import {
    requireAuth,
} from './util';

type HandleUserRoutesOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
};

export async function handleUserRoutes(opts: HandleUserRoutesOptions): Promise<void> {
    const { req } = opts;

    if (usersRoute.testPath(req.pathname)) {
        await handleGetUser({
            model: opts.model,
            req,
            resp: opts.resp,
        });
    } else if (userRoute.testPath(req.pathname)) {
        await handleGetAuthUser({
            model: opts.model,
            req,
            resp: opts.resp,
        });
    } else {
        throw createHttpError(HttpStatus.NOT_FOUND);
    }
}

export default handleUserRoutes;

type HandleGetUserOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
};

async function handleGetUser(opts: HandleGetUserOptions): Promise<void> {
    const { req, resp, model } = opts;

    const routeParams = usersRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    if (!(await hasUser(model, routeParams.username))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such user: ${routeParams.username}`);
    }

    const user = await getPublicUserInfo(model, routeParams.username);
    setBodyJson(resp, user);
}

type HandleGetAuthUserOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
};

async function handleGetAuthUser(opts: HandleGetAuthUserOptions): Promise<void> {
    const { req, resp, model } = opts;

    const routeParams = userRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        throw createHttpError(HttpStatus.METHOD_NOT_ALLOWED);
    }

    const authLogin = await requireAuth(req, model);

    const user = await getPublicUserInfo(model, authLogin);
    setBodyJson(resp, user);
}

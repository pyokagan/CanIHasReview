import {
    HttpStatus,
    Request,
    Response,
    setBodyJson,
} from '@lib/http';
import createHttpError from 'http-errors';
import {
    getOauthClient,
    GithubModel,
    hasOauthClient,
} from '../model';
import {
    oauthAccessTokenRoute,
} from './routes';

export type OauthAccessTokenCallback = (clientId: string, code: string) =>
    undefined | string | Promise<string> | Promise<undefined>;

type HandleOauthAccessTokenOptions = {
    req: Request;
    resp: Response;
    model: GithubModel;
    genAccessToken?: OauthAccessTokenCallback;
};

export async function handleOauthAccessToken(opts: HandleOauthAccessTokenOptions): Promise<void> {
    const { req, resp, model, genAccessToken } = opts;

    const routeParams = oauthAccessTokenRoute.matchPath(req.pathname, req.search);
    if (!routeParams) {
        throw new Error(`bad request path: ${req.pathname}${req.search}`);
    }

    const clientId = routeParams.client_id;
    const clientSecret = routeParams.client_secret;
    if (!clientId) {
        throw createHttpError(HttpStatus.NOT_FOUND, 'clientId not provided');
    }
    if (!clientSecret) {
        throw createHttpError(HttpStatus.NOT_FOUND, 'clientSecret not provided');
    }

    if (!(await hasOauthClient(model, clientId))) {
        throw createHttpError(HttpStatus.NOT_FOUND, `no such client id: ${clientId}`);
    }

    const client = await getOauthClient(model, clientId);
    if (client.secret !== clientSecret) {
        throw createHttpError(HttpStatus.NOT_FOUND,
            `client secret does not match: ${clientSecret} !== ${client.secret}`);
    }

    const badCodeError = {
        error: 'bad_verification_code',
        error_description: 'The code passed is incorrect or expired.',
    };

    const code = routeParams.code;
    if (!code) {
        setBodyJson(resp, badCodeError);
        return;
    }

    if (genAccessToken) {
        const accessToken = await genAccessToken(clientId, code);
        if (!accessToken) {
            setBodyJson(resp, badCodeError);
            return;
        }

        setBodyJson(resp, {
            'access_token': accessToken,
            'token_type': 'bearer',
        });
    } else {
        setBodyJson(resp, badCodeError);
        return;
    }
}

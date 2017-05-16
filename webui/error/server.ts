/**
 * @module
 * Error page to be displayed whenever there is an unhandled exception.
 */
import {
    HttpStatus,
    Request,
    RequestConsole,
    Response,
} from '@lib/http';
import {
    AuthContext,
} from '@webui/auth/server';
import renderServer from '@webui/renderServer';
import {
    STATUS_CODES,
} from 'http';
import {
    HttpError,
} from 'http-errors';
import ErrorPage from './entry';

type Options = {
    req: Request;
    resp: Response;
    e: any;
    auth: AuthContext | undefined;
};

export async function handleError(opts: Options): Promise<void> {
    const { req, resp, e } = opts;
    logError(req.console, e);
    const status: HttpStatus = e.status || HttpStatus.INTERNAL_SERVER_ERROR;
    resp.status = status;
    const expose = typeof e.expose === 'boolean' ? e.expose : status < 500;
    const title = `${status} ${STATUS_CODES[status] || 'Unknown Error'}`;
    const message: string = expose ? e.message : '';
    renderServer(resp, __dirname, title, ErrorPage, {
        ghUserInfo: opts.auth ? opts.auth.ghUserInfo : null,
        message,
        mountPath: req.mountPath,
        pathname: req.pathname,
        reqId: expose ? undefined : req.id,
        search: req.search,
        title,
    });
}

function logError(console: RequestConsole, err: any): void {
    if (!(err instanceof Error)) {
        console.error('webui/error: FATAL ERROR');
        console.error(`non-error thrown: ${err}`);
        return;
    }

    const obj: Partial<HttpError> = err;
    if (obj.expose) {
        return;
    }

    console.error('webui/error: FATAL ERROR');
    console.error(obj.stack || '');
}

export default handleError;

import {
    ServerRequest as RawNodeRequest,
    ServerResponse as RawNodeResponse,
    STATUS_CODES,
} from 'http';
import {
    nodeRequestToRequest,
    Request,
} from './request';
import {
    Response,
    sendResponse,
} from './response';
import {
    HttpStatus,
} from './status';

type Fn = (req: Request, resp: Response) => Promise<void> | void;
type Wrapper = (nodeReq: RawNodeRequest, nodeResp: RawNodeResponse) => Promise<void>;
type Options = {
    proxy?: boolean;
};

export function wrapServerCallback(fn: Fn, options?: Options): Wrapper {
    const opts = options || {};

    return async (nodeReq: RawNodeRequest, nodeResp: RawNodeResponse): Promise<void> => {
        try {
            const req = nodeRequestToRequest(nodeReq, opts);
            const resp = new Response();
            await fn(req, resp);
            await sendResponse(nodeResp, resp, req.method === 'HEAD');
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(`non-error thrown: ${e}`);
            }

            if (!e.expose) {
                const msg: string = e.stack || e.toString();
                console.error();
                console.error(msg);
                console.error();
            }

            if (nodeResp.headersSent || !nodeResp.writable) {
                return;
            } // can't do anything

            if (typeof e.status === 'number') {
                nodeResp.statusCode = e.status;
            } else {
                nodeResp.statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
            }

            nodeResp.setHeader('Content-Type', 'text/plain; charset=utf-8');
            const msg = e.expose ? e.message : STATUS_CODES[nodeResp.statusCode];
            const msgBytes = Buffer.from(`${msg}\n`, 'utf8');
            nodeResp.setHeader('Content-Length', `${msgBytes.length}`);
            nodeResp.end(msgBytes);
        }
    };
}

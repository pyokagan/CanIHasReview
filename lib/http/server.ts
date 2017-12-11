import {
    LineTransform,
} from '@lib/stream-util';
import {
    ServerRequest as RawNodeRequest,
    ServerResponse as RawNodeResponse,
    STATUS_CODES,
} from 'http';
import uuid from 'uuid';
import {
    nodeRequestToRequest,
    Request,
    RequestConsole,
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
        const reqId = uuid.v1();
        const reqConsole = initLogging(reqId, nodeReq, nodeResp);
        try {
            const req = nodeRequestToRequest(nodeReq, {
                console: reqConsole,
                id: reqId,
                proxy: opts.proxy,
            });
            const resp = new Response();
            await fn(req, resp);
            await sendResponse(nodeResp, resp, req.method === 'HEAD');
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(`non-error thrown: ${e}`);
            }

            if (!e.expose) {
                const msg: string = e.stack || e.toString();
                reqConsole.error('');
                reqConsole.error(msg);
                reqConsole.error('');
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

function initLogging(reqId: string, req: RawNodeRequest, resp: RawNodeResponse): RequestConsole {
    const reqConsole = createSystemdRequestConsole(process.stderr, reqId);
    const method = req.method;
    const url = req.url;
    reqConsole.info(`<-- ${method} ${url}`);

    const onFinish = () => done('finish');
    const onClose = () => done('close');
    resp.once('finish', onFinish);
    resp.once('close', onClose);

    const start = Date.now();

    return reqConsole;

    function done(event: 'finish' | 'close'): void {
        resp.removeListener('finish', onFinish);
        resp.removeListener('close', onClose);
        const symbol = event === 'finish' ? '-->' : '-x-';
        const delta = Date.now() - start;
        reqConsole.info(`${symbol} ${method} ${url} ${resp.statusCode} ${formatTime(delta)}`);
        reqConsole.end();
    }
}

function formatTime(ms: number): string {
    return ms < 10000 ? `${ms}ms` : `${Math.round(ms / 1000)}s`;
}

/**
 * Creates a logging console that:
 *
 * - Prefixes all lines with the request ID.
 * - Communicates the log level to systemd via logging prefixes
 *   (http://0pointer.de/public/systemd-man/sd-daemon.html)
 */
function createSystemdRequestConsole(stream: NodeJS.WritableStream, reqId: string): RequestConsole & { end(): void; } {
    const reqPrefix = Buffer.from(`req-${reqId}: `);
    const SD_DEBUG = Buffer.from('<7>');
    const SD_INFO = Buffer.from('<6>');
    const SD_WARN = Buffer.from('<4>');
    const SD_ERROR = Buffer.from('<3>');
    let currentLogLevel = SD_DEBUG;
    const logStream = new LineTransform(line => Buffer.concat([currentLogLevel, reqPrefix, line]));
    logStream.pipe(stream);
    return {
        log(message: string): void {
            currentLogLevel = SD_DEBUG;
            logStream.write(message + '\n');
        },
        warn(message: string): void {
            currentLogLevel = SD_WARN;
            logStream.write(message + '\n');
        },
        error(message: string): void {
            currentLogLevel = SD_ERROR;
            logStream.write(message + '\n');
        },
        info(message: string): void {
            currentLogLevel = SD_INFO;
            logStream.write(message + '\n');
        },
        end(): void {
            logStream.end();
        },
    };
}

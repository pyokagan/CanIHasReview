import {
    Console,
} from 'console';
import {
    ServerRequest as NodeRequest,
} from 'http';
import createHttpError from 'http-errors';
import qs from 'querystringify';
import urlParse from 'url-parse';
import uuid from 'uuid';
import {
    HttpMethod,
    isHttpMethod,
} from './method';
import {
    HttpProtocol,
} from './protocol';
import {
    HttpStatus,
} from './status';

export interface RequestConsole {
    log(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

/**
 * Represents a HTTP Request.
 */
export interface Request {
    /**
     * Request Id.
     */
    id: string;

    /**
     * Request console.
     */
    console: RequestConsole;

    /**
     * Mountpath.
     */
    mountPath: string;

    /**
     * HTTP method.
     */
    method: HttpMethod;

    /**
     * Request protocol.
     */
    protocol: HttpProtocol;

    /**
     * Request pathname, URL-encoded.
     * If non-empty, it will begin with a '/'.
     */
    pathname: string;

    /**
     * The "querystring" component of the URL, with the leading `?`.
     * An empty string if no querystring was provided.
     */
    search: string;

    /**
     * The parsed query string. URL-decoded.
     */
    query: Map<string, string>;

    /**
     * The `Host` header field, or `X-Forwarded-Host` when a proxy is enabled.
     */
    host: string;

    /**
     * Headers.
     * Recommended not to use this field directly,
     * but to use one of the header helper functions instead.
     */
    headers: { [key: string]: string | string[] | undefined };

    /**
     * Request body.
     */
    body(limit?: number): Promise<Buffer>;
}

type RequestOptions = {
    method: HttpMethod;
    url: string;

    /**
     * Request Id. Default: Random ID.
     */
    id: string;

    /**
     * Console to use for logging.
     */
    console?: RequestConsole;

    /**
     * Additional headers.
     */
    headers?: { [key: string]: string };

    /**
     * Request body (if any).
     */
    body?: string | Buffer;
};

/**
 * Create a synthetic request.
 */
export function createRequest(options: RequestOptions): Request {
    const console = options.console || createDummyRequestConsole();
    const parsedUrl = urlParse(options.url, false);

    const protocol = handleUrlParseProtocol(parsedUrl.protocol);
    const search = (parsedUrl.query as any) as string;
    const query = new Map<string, string>();
    const parsedQs = qs.parse(search);
    for (const key of Object.keys(parsedQs)) {
        query.set(key, parsedQs[key]);
    }

    const headers: { [key: string]: string } = {};
    if (typeof options.headers === 'object') {
        for (const key of Object.keys(options.headers)) {
            headers[key.toLowerCase()] = options.headers[key];
        }
    }

    return {
        body: handleBody(options.body),
        console,
        headers,
        host: parsedUrl.host,
        id: options.id,
        method: options.method,
        mountPath: '',
        pathname: parsedUrl.pathname,
        protocol,
        query,
        search,
    };

    function handleBody(body?: string | Buffer): (limit?: number) => Promise<Buffer> {
        if (!body) {
            const emptyBuffer = Buffer.alloc(0);
            return () => Promise.resolve(emptyBuffer);
        } else {
            const buffer = typeof body === 'string' ? Buffer.from(body, 'utf8') : body;
            return async (limit?: number): Promise<Buffer> => {
                if (limit && buffer.byteLength > limit) {
                    throw createHttpError(HttpStatus.PAYLOAD_TOO_LARGE, 'request entity too large');
                }
                return buffer;
            };
        }
    }
}

function handleUrlParseProtocol(protocol: string): HttpProtocol {
    switch (protocol) {
    case 'http:':
        return 'http';
    case 'https:':
        return 'https';
    default:
        throw new TypeError(`protocol must be a valid HttpProtocol, got ${protocol}`);
    }
}

type NodeRequestOptions = {
    proxy?: boolean;
    id?: string;
    console?: RequestConsole;
};

/**
 * @param nodeReq The request
 * @param proxy Whether to parse in proxy mode or not.
 */
export function nodeRequestToRequest(nodeReq: NodeRequest, options?: NodeRequestOptions): Request {
    if (!options) {
        options = {};
    }
    const proxy = options.proxy || false;
    const id = options.id || uuid.v1();
    const console = options.console || createRequestConsole(process.stderr);

    const method = nodeReq.method;
    if (!isHttpMethod(method)) {
        throw createHttpError(HttpStatus.NOT_IMPLEMENTED, 'unsupported request method', {
            expose: true,
        });
    }

    // Parse Url
    const url = nodeReq.url;
    if (!url) {
        throw new Error('request url not specified');
    }
    const parsedUrl = parseHttpUrl(url);
    if (!parsedUrl) {
        throw createHttpError(HttpStatus.NOT_IMPLEMENTED, 'unsupported url', {
            expose: true,
        });
    }
    const { pathname, search } = parsedUrl;
    const query = new Map<string, string>();
    const parsedQs = qs.parse(search);
    for (const key of Object.keys(parsedQs)) {
        query.set(key, parsedQs[key]);
    }

    const body = (limit?: number) => new Promise<Buffer>((resolve, reject) => {
        let completed = false;
        const chunks: Buffer[] = [];
        let chunksTotalByteLength = 0;

        nodeReq.on('aborted', onAborted);
        nodeReq.on('close', onClose);
        nodeReq.on('data', onData);
        nodeReq.on('end', onEnd);
        nodeReq.on('error', onError);

        function onAborted(): void {
            if (completed) {
                return;
            }
            reject(createHttpError(HttpStatus.BAD_REQUEST, 'request aborted'));
            completed = true;
        }

        function onData(chunk: Buffer): void {
            if (completed) {
                return;
            }
            chunks.push(chunk);
            chunksTotalByteLength += chunk.byteLength;
            if (limit && chunksTotalByteLength > limit) {
                reject(createHttpError(HttpStatus.PAYLOAD_TOO_LARGE, 'request entity too large'));
                completed = true;
                return;
            }
        }

        function onEnd(): void {
            if (completed) {
                return;
            }
            resolve(Buffer.concat(chunks));
            chunks.length = 0;
            completed = true;
        }

        function onError(e: any): void {
            if (completed) {
                return;
            }
            reject(e);
            completed = true;
        }

        function onClose(): void {
            chunks.length = 0;
            nodeReq.removeListener('aborted', onAborted);
            nodeReq.removeListener('data', onData);
            nodeReq.removeListener('end', onEnd);
            nodeReq.removeListener('error', onError);
            nodeReq.removeListener('close', onClose);
        }
    });

    return {
        body,
        console,
        headers: nodeReq.headers,
        host: nodeRequestToHost(nodeReq, proxy),
        id,
        method,
        mountPath: '',
        pathname,
        protocol: nodeRequestToProtocol(nodeReq, proxy),
        query,
        search,
    };
}

function nodeRequestToHost(nodeReq: NodeRequest, proxy: boolean): string {
    const xForwardedHost = proxy ? (nodeReq.headers['x-forwarded-host'] as string | undefined) : undefined;
    const host = xForwardedHost || (nodeReq.headers['host'] as string | undefined) || '';
    return host.split(/\s*,\s*/)[0];
}

function nodeRequestToProtocol(nodeReq: NodeRequest, proxy: boolean): HttpProtocol {
    if ((nodeReq.socket as any).encrypted) {
        return 'https';
    }
    if (!proxy) {
        return 'http';
    }
    const protoHeader = (nodeReq.headers['x-forwarded-proto'] as string | undefined) || 'http';
    const proto = protoHeader.split(/\s*,\s*/)[0];
    if (proto === 'http' || proto === 'https') {
        return proto;
    } else {
        return 'http';
    }
}

function parseHttpUrl(url: string): { pathname: string, search: string } | undefined {
    if (!url.startsWith('/')) {
        return;
    }

    // Find querystring part
    const searchIndex = url.indexOf('?');
    const search = searchIndex >= 1 ? url.substr(searchIndex) : '';
    const pathname = url.substring(0, searchIndex >= 1 ? searchIndex : url.length);

    return {
        pathname,
        search,
    };
}

/**
 * Create a request console which does nothing.
 */
export function createDummyRequestConsole(): RequestConsole {
    const dummy = () => {};
    return {
        error: dummy,
        info: dummy,
        log: dummy,
        warn: dummy,
    };
}

/**
 * Create a request console which writes to a stream.
 */
export function createRequestConsole(stream: NodeJS.WritableStream): RequestConsole {
    return new Console(stream);
}

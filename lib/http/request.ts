import {
    ServerRequest as NodeRequest,
} from 'http';
import createHttpError from 'http-errors';
import qs from 'querystringify';
import urlParse from 'url-parse';
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

/**
 * Represents a HTTP Request.
 */
export interface Request {
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
}

type RequestOptions = {
    method: HttpMethod;
    url: string;
};

/**
 * Create a synthetic request.
 */
export function createRequest(options: RequestOptions): Request {
    const parsedUrl = urlParse(options.url, false);

    const protocol = handleUrlParseProtocol(parsedUrl.protocol);
    const search = (parsedUrl.query as any) as string;
    const query = new Map<string, string>();
    const parsedQs = qs.parse(search);
    for (const key of Object.keys(parsedQs)) {
        query.set(key, parsedQs[key]);
    }

    return {
        headers: {},
        host: parsedUrl.host,
        method: options.method,
        mountPath: '',
        pathname: parsedUrl.pathname,
        protocol,
        query,
        search,
    };
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

    return {
        headers: nodeReq.headers,
        host: nodeRequestToHost(nodeReq, proxy),
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

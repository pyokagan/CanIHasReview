/**
 * @module
 * Functionality for mocking external web services using the Fetch API.
 */
import * as Fetch from '@lib/fetch';
import uuid from 'uuid';
import {
    setHeader,
} from './headers';
import {
    isHttpMethod,
} from './method';
import {
    createRequest,
    Request,
} from './request';
import {
    Response,
} from './response';
import {
    HttpStatus,
} from './status';

export {
    Fetch,
    Response,
    RequestInit,
    Headers,
} from '@lib/fetch';

type Fn = (req: Request, resp: Response) => Promise<void> | void;

export function mockFetch(fn: Fn): Fetch.Fetch {
    return async (url: string, init?: Fetch.RequestInit): Promise<Fetch.Response> => {
        const req = fetchRequestToRequest(url, init);

        try {
            const resp = new Response();
            await fn(req, resp);
            return responseToFetchResponse(resp, req.method === 'HEAD');
        } catch (e) {
            if (!(e instanceof Error)) {
                e = new Error(`non-error thrown: ${e}`);
            }

            const resp = new Response();
            resp.status = typeof e.status === 'number' ? e.status : HttpStatus.INTERNAL_SERVER_ERROR;
            setHeader(resp, 'Content-Type', 'text/plain; charset=utf-8');
            resp.body = `${e.message}\n`;
            return responseToFetchResponse(resp, req.method === 'HEAD');
        }
    };
}

function fetchRequestToRequest(url: string, init?: Fetch.RequestInit): Request {
    const myInit = init || {};
    const method = myInit.method || 'GET';
    if (!isHttpMethod(method)) {
        throw new Error(`invalid request method: ${method}`);
    }

    return createRequest({
        body: myInit.body,
        headers: myInit.headers,
        id: uuid.v1(),
        method,
        url,
    });
}

function responseToFetchResponse(resp: Response, noBody: boolean): Fetch.Response {
    const status = resp.status || HttpStatus.OK;
    const body = resp.body;
    const headers = resp.headers;

    const headersApi: Fetch.Headers = {
        get(key: string): string | null {
            const values = headers.get(key);
            if (!values) {
                return null;
            }
            return values.join(',');
        },

        has(key: string): boolean {
            return headers.has(key) && !!headers.get(key);
        },

        *entries(): IterableIterator<[string, string]> {
            for (const [key, values] of headers.entries()) {
                for (const value of values) {
                    yield [key, value];
                }
            }
        },
    };

    return {
        headers: headersApi,
        json,
        status,
    };

    async function json(): Promise<any> {
        if (noBody) {
            throw new Error('Response has no body.');
        }

        if (typeof body !== 'string') {
            throw new Error(`Response body is not a string: ${body}`);
        }
        return JSON.parse(body);
    }
}

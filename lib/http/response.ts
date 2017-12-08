import * as StreamUtil from '@lib/stream-util';
import {
    ServerResponse as NodeResponse,
    STATUS_CODES,
} from 'http';
import {
    HttpStatus,
    isEmptyBodyHttpStatus,
} from './status';

type BodyCallback = (stream: NodeJS.WritableStream) => void | Promise<void>;

export interface Response {
    /**
     * Response status.
     */
    status?: HttpStatus;

    /**
     * Response body.
     * If set to a Buffer, it will be sent as-is with the `Content-Length` header set.
     * If set to a string, it will be sent as UTF-8 encoded bytes with the `Content-Length` header set.
     * If set to a callback, it will be called with the output stream.
     */
    body?: Buffer | string | BodyCallback;

    /**
     * Response headers.
     */
    headers: Map<string, string[]>;
}

export class Response implements Response {
    status?: HttpStatus;
    body?: Buffer | string | BodyCallback;
    headers: Map<string, string[]>;

    constructor() {
        this.headers = new Map<string, string[]>();
    }
}

export async function sendResponse(nodeResp: NodeResponse, resp: Response, noBody: boolean): Promise<void> {
    if (nodeResp.finished) {
        return; // Nothing we can do here
    }

    if (nodeResp.headersSent) {
        await writeBody(nodeResp, resp, noBody);
        await nodeResponseEnd(nodeResp);
        return;
    }

    nodeResp.statusCode = resp.status || HttpStatus.OK;

    // Set response headers
    for (const [key, value] of resp.headers) {
        nodeResp.setHeader(key, value);
    }

    if (isEmptyBodyHttpStatus(nodeResp.statusCode)) {
        nodeResp.removeHeader('Content-Type');
        nodeResp.removeHeader('Content-Length');
        nodeResp.removeHeader('Transfer-Encoding');
        await nodeResponseEnd(nodeResp);
        return;
    }

    await writeBody(nodeResp, resp, noBody);
    await nodeResponseEnd(nodeResp);
    return;
}

async function writeBody(nodeResp: NodeResponse, resp: Response, noBody: boolean): Promise<void> {
    let body = resp.body;
    if (typeof body === 'undefined') {
        nodeResp.setHeader('Content-Type', 'text/html; charset=utf-8');
        body = Buffer.from(`${nodeResp.statusCode} ${STATUS_CODES[nodeResp.statusCode]}\n`);
    }
    if (typeof body === 'string') {
        body = Buffer.from(body);
    }
    if (typeof body === 'function') {
        await body(noBody ? new StreamUtil.DummyWritable() : nodeResp);
        return;
    }
    nodeResp.setHeader('Content-Length', `${body.length}`);
    if (!noBody) {
        await StreamUtil.write(nodeResp, body);
    }
}

function nodeResponseEnd(nodeResp: NodeResponse): Promise<void> {
    return new Promise((resolve, reject) => {
        nodeResp.addListener('close', reject);
        nodeResp.addListener('error', reject);
        nodeResp.end(() => {
            nodeResp.removeListener('close', reject);
            nodeResp.removeListener('error', reject);
            resolve();
        });
    });
}

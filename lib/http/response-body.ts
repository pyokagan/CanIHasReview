/**
 * @module
 * Support for setting response bodies.
 */
import createHttpError from 'http-errors';
import mime from 'mime';
import {
    readFile as fsReadFile,
} from 'mz/fs';
import {
    setHeader,
} from './headers';
import {
    Response,
} from './response';

/**
 * Sets the response body to the text `value`.
 */
export function setBodyText(resp: Response, value: string | Buffer, encoding?: string): void {
    if (!encoding) {
        encoding = 'utf-8';
    }
    resp.body = encoding === 'utf-8' ? value : toBuffer(value);
    setHeader(resp, 'Content-Type', `text/plain; charset=${encoding}`);
}

/**
 * Sets the response body to the HTML `value`.
 */
export function setBodyHtml(resp: Response, value: string | Buffer, encoding?: string): void {
    if (!encoding) {
        encoding = 'utf-8';
    }
    resp.body = encoding === 'utf-8' ? value : toBuffer(value);
    setHeader(resp, 'Content-Type', `text/html; charset=${encoding}`);
}

/**
 * Sets the response body to the JSON `value`.
 */
export function setBodyJson(resp: Response, value: any, encoding?: string): void {
    if (!encoding) {
        encoding = 'utf-8';
    }
    const jsonValue = JSON.stringify(value, undefined, 2);
    resp.body = encoding === 'utf-8' ? jsonValue : Buffer.from(jsonValue);
    setHeader(resp, 'Content-Type', `application/json; charset=${encoding}`);
}

/**
 * Sends the contents of `filename`, and finishes the response.
 * The mimetype of the response is set based on the file extension of `filename`.
 */
export async function setBodyFile(resp: Response, filename: string): Promise<void> {
    const mimeType = mime.getType(filename) || 'application/octet-stream';
    const content = await readFile(filename);
    setHeader(resp, 'Content-Type', mimeType);
    setHeader(resp, 'Content-Length', `${content.length}`);
    resp.body = content;
}

async function readFile(filename: string): Promise<Buffer> {
    try {
        return await fsReadFile(filename);
    } catch (e) {
        if (!(e instanceof Error)) {
            throw e;
        }

        if ((e as any).code === 'ENOENT' || (e as any).code === 'EISDIR') {
            throw createHttpError(404);
        }

        throw e;
    }
}

function toBuffer(value: string | Buffer): Buffer {
    return typeof value === 'string' ? Buffer.from(value) : value;
}

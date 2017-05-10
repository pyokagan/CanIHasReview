/**
 * @module
 * HTML user interface.
 */
import {
    HttpStatus,
    Request,
    Response,
} from '@lib/http';
import createHttpError from 'http-errors';
import handleError from './error/server';
import handleHome from './home/server';

/**
 * WebUI main entry point.
 */
export async function main(req: Request, resp: Response): Promise<void> {
    try {
        let handled = false;

        handled = await handleHome({
            req,
            resp,
        });
        if (handled) {
            return;
        }

        throw createHttpError(HttpStatus.NOT_FOUND);
    } catch (e) {
        await handleError({
            e,
            req,
            resp,
        });
    }
}

export default main;

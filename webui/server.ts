/**
 * @module
 * HTML user interface.
 */
import {
    HttpStatus,
    Request,
    Response,
} from '@lib/http';
import {
    homeRoute,
} from '@webui/routes';
import createHttpError from 'http-errors';
import handleError from './error/server';
import handleHome from './home/server';

/**
 * WebUI main entry point.
 */
export async function main(req: Request, resp: Response): Promise<void> {
    try {
        if (homeRoute.testPath(req.pathname)) {
            await handleHome({
                req,
                resp,
            });
        } else {
            throw createHttpError(HttpStatus.NOT_FOUND);
        }
    } catch (e) {
        await handleError({
            e,
            req,
            resp,
        });
    }
}

export default main;

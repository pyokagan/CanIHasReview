import appConfig from '@config';
import {
    extractEnvVar,
} from '@lib/env';
import {
    HttpStatus,
    mount,
    Request,
    Response,
    setBodyFile,
    setHeader,
    wrapServerCallback,
} from '@lib/http';
import {
    resolveFsPath,
} from '@lib/url-path';
import * as WebUi from '@webui/server';
import http from 'http';
import createHttpError from 'http-errors';
import path from 'path';

/**
 * Server configuration.
 */
interface Config {
    proxy: boolean;
    port: number;
}

/**
 * Extracts server configuration from process.env.
 */
function extractConfigFromEnv(): Config {
    return {
        port: parseInt(extractEnvVar('PORT', '5000'), 10),
        proxy: !!extractEnvVar('PROXY', ''),
    };
}

/**
 * Main request entry point.
 */
async function main(req: Request, resp: Response): Promise<void> {
    let handled = false;

    handled = await mount(req, '/static', () => handleStatic(req, resp));
    if (handled) {
        return;
    }

    await WebUi.main(req, resp);
}

/**
 * Handle static files.
 */
async function handleStatic(req: Request, resp: Response): Promise<void> {
    const staticDir = path.resolve(__webpack_dirname, appConfig.publicOutputDir);
    const staticFile = resolveFsPath(staticDir, req.pathname);
    if (!staticFile) {
        throw createHttpError(HttpStatus.NOT_FOUND);
    }
    setHeader(resp, 'Cache-Control', 'max-age=31536000');
    await setBodyFile(resp, staticFile);
}

const config: Config = extractConfigFromEnv();
const server = http.createServer(wrapServerCallback(main, {
    proxy: config.proxy,
}));
server.listen(config.port, 'localhost');

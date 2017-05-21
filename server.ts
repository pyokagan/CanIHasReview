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
    JobRunner,
} from '@lib/job';
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
    secure: boolean;
    sessionSecret: string;
    githubClientId: string;
    githubClientSecret: string;
    githubToken: string;
}

/**
 * Extracts server configuration from process.env.
 */
function extractConfigFromEnv(): Config {
    return {
        githubClientId: extractEnvVar('GITHUB_CLIENT_ID'),
        githubClientSecret: extractEnvVar('GITHUB_CLIENT_SECRET'),
        githubToken: extractEnvVar('GITHUB_TOKEN'),
        port: parseInt(extractEnvVar('PORT', '5000'), 10),
        proxy: !!extractEnvVar('PROXY', ''),
        secure: !!extractEnvVar('SECURE', ''),
        sessionSecret: extractEnvVar('SESSION_SECRET'),
    };
}

/**
 * Main request entry point.
 */
async function main(req: Request, resp: Response, config: Config, jobRunner: JobRunner<any>): Promise<void> {
    if (config.secure && req.protocol !== 'https') {
        throw createHttpError(HttpStatus.NOT_IMPLEMENTED,
                'This website must be accessed over https', {
                    expose: true,
                });
    }

    let handled = false;

    handled = await mount(req, '/static', () => handleStatic(req, resp));
    if (handled) {
        return;
    }

    await WebUi.main(req, resp, {
        githubClientId: config.githubClientId,
        githubClientSecret: config.githubClientSecret,
        githubToken: config.githubToken,
        jobRunner,
        secure: config.secure,
        sessionSecret: config.sessionSecret,
    });
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
const jobRunner = new JobRunner<any>({
    stream: process.stderr,
});
const server = http.createServer(wrapServerCallback((req, resp) => main(req, resp, config, jobRunner), {
    proxy: config.proxy,
}));
server.listen(config.port, 'localhost');

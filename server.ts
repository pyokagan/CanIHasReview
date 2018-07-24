import appConfig from '@config';
import {
    extractEnvVar,
} from '@lib/env';
import {
    Fetch,
} from '@lib/fetch';
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
    MemoryJobRunner,
} from '@lib/job';
import {
    resolveFsPath,
} from '@lib/url-path';
import * as WebUi from '@webui/server';
import fetchPonyfill from 'fetch-ponyfill';
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

type RequestMainOptions = {
    req: Request;
    resp: Response;
    jobRunner: JobRunner<any>;
    secure: boolean;
    sessionSecret: string;
    githubClientId: string;
    githubClientSecret: string;
    githubToken: string;
    fetch: Fetch;
};

/**
 * Main request entry point.
 */
async function requestMain(options: RequestMainOptions): Promise<void> {
    const {req, resp} = options;

    if (options.secure && req.protocol !== 'https') {
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

    await WebUi.main({
        fetch: options.fetch,
        githubClientId: options.githubClientId,
        githubClientSecret: options.githubClientSecret,
        githubToken: options.githubToken,
        jobRunner: options.jobRunner,
        req,
        resp,
        secure: options.secure,
        sessionSecret: options.sessionSecret,
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

function main(): void {
    const config: Config = extractConfigFromEnv();
    const jobRunner = new MemoryJobRunner<any>({
        stream: process.stderr,
    });
    const { fetch } = fetchPonyfill();
    const serverCallback = wrapServerCallback((req, resp) => {
        return requestMain({
            fetch,
            githubClientId: config.githubClientId,
            githubClientSecret: config.githubClientSecret,
            githubToken: config.githubToken,
            jobRunner,
            req,
            resp,
            secure: config.secure,
            sessionSecret: config.sessionSecret,
        });
    }, {
        proxy: config.proxy,
    });
    const server = http.createServer(serverCallback);
    server.listen(config.port, 'localhost');
}

main();

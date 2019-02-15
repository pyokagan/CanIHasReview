import appConfig from '@config';
import {
    SystemClock,
} from '@lib/clock';
import {
    extractEnvVar,
} from '@lib/env';
import {
    api3main as fakeGithubApiMain,
    createGithubModel,
} from '@lib/fake-github';
import {
    Fetch,
} from '@lib/fetch';
import {
    HttpStatus,
    mockFetch,
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
    mock: string;
    mountPath: string;
}

/**
 * Extracts server configuration from process.env.
 */
function extractConfigFromEnv(): Config {
    return {
        githubClientId: extractEnvVar('GITHUB_CLIENT_ID'),
        githubClientSecret: extractEnvVar('GITHUB_CLIENT_SECRET'),
        githubToken: extractEnvVar('GITHUB_TOKEN'),
        mock: extractEnvVar('MOCK', ''),
        mountPath: extractEnvVar('MOUNTPATH', ''),
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
    mountPath: string;
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

    handled = await mount(req, options.mountPath + '/static', () => handleStatic(req, resp));
    if (handled) {
        return;
    }

    handled = await mount(req, options.mountPath, () => WebUi.main({
        fetch: options.fetch,
        githubClientId: options.githubClientId,
        githubClientSecret: options.githubClientSecret,
        githubToken: options.githubToken,
        jobRunner: options.jobRunner,
        req,
        resp,
        secure: options.secure,
        sessionSecret: options.sessionSecret,
    }));
    if (handled) {
        return;
    }

    throw createHttpError(HttpStatus.NOT_FOUND);
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

async function main(): Promise<void> {
    const config: Config = extractConfigFromEnv();
    const jobRunner = new MemoryJobRunner<any>({
        stream: process.stderr,
    });
    let fetch: Fetch = fetchPonyfill().fetch;
    if (config.mock) {
        const clock = new SystemClock();
        const githubModel = await createGithubModel({
            clock,
            dir: config.mock,
        });
        const genAccessToken = () => 'testusertoken';
        fetch = mockFetch((req, resp) => {
            return fakeGithubApiMain({
                genAccessToken,
                model: githubModel,
                req,
                resp,
            });
        });
    }

    const serverCallback = wrapServerCallback((req, resp) => {
        return requestMain({
            fetch,
            githubClientId: config.githubClientId,
            githubClientSecret: config.githubClientSecret,
            githubToken: config.githubToken,
            jobRunner,
            mountPath: config.mountPath,
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

    let terminating = false;
    process.on('SIGTERM', () => {
        if (terminating) {
            return;
        }
        terminating = true;
        const serverClose = new Promise(resolve => server.close(resolve));
        Promise.all([serverClose, jobRunner.shutdown()]).then(() => {
            process.exit(0);
        }, e => {
            console.error(e.stack || e);
            process.exit(1);
        });
    });
}

main().catch(e => {
    console.error(e.stack || e);
    process.exit(1);
});

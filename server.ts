import http from 'http';
import Koa from 'koa';
import compose from 'koa-compose';
import mount from 'koa-mount';
import session from 'koa-session';
import serve from 'koa-static';
import path from 'path';
import appConfig from './config';
import { JobRunner } from './lib/job';
import * as KoaLogger from './lib/koa-logger';
import notFound from './lib/koa-notfound';
import * as WebUi from './webui/server';

/**
 * Server configuration.
 */
interface Config {
    KOA_KEYS: string[];
    KOA_PROXY: boolean;
    PORT: number;
    GITHUB_CLIENT_ID: string;
    GITHUB_CLIENT_SECRET: string;
    GITHUB_TOKEN: string;
}

/**
 * Extracts environment variable from process.env.
 * @throws {Error} Environment variable not defined and defaultValue not provided.
 */
function extractEnvVar(key: string, defaultValue?: string): string {
    if (process.env[key]) {
        return process.env[key];
    } else if (typeof defaultValue !== 'undefined') {
        return defaultValue;
    } else {
        throw new Error(`$${key} not defined`);
    }
}

/**
 * Extracts server configuration from process.env.
 */
function extractConfigFromEnv(): Config {
    return {
        GITHUB_CLIENT_ID: extractEnvVar('GITHUB_CLIENT_ID'),
        GITHUB_CLIENT_SECRET: extractEnvVar('GITHUB_CLIENT_SECRET'),
        GITHUB_TOKEN: extractEnvVar('GITHUB_TOKEN'),
        KOA_KEYS: extractEnvVar('KOA_KEYS').split(/s+/),
        KOA_PROXY: !!extractEnvVar('KOA_PROXY', ''),
        PORT: parseInt(extractEnvVar('PORT', '5000'), 10),
    };
}

const config: Config = extractConfigFromEnv();

const jobRunner = new JobRunner<any>();

const app = new Koa();
app.keys = config.KOA_KEYS;
app.proxy = config.KOA_PROXY;

app.use(KoaLogger.createMiddleware({}));
app.use(mount(appConfig.publicPath, compose([
    serve(path.resolve(__webpack_dirname, appConfig.publicOutputDir), {
        maxage: 365 * 24 * 60 * 60,
    }),
    notFound(),
])));
app.use(session(app));
app.use(mount('/', WebUi.middleware({
    GITHUB_CLIENT_ID: config.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: config.GITHUB_CLIENT_SECRET,
    githubToken: config.GITHUB_TOKEN,
    jobRunner,
})));

const server = http.createServer(app.callback());
server.listen(config.PORT, 'localhost');

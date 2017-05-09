import http from 'http';
import Koa from 'koa';
import compose from 'koa-compose';
import mount from 'koa-mount';
import serve from 'koa-static';
import path from 'path';
import appConfig from './config';
import notFound from './lib/koa-notfound';

/**
 * Server configuration.
 */
interface Config {
    KOA_KEYS: string[];
    KOA_PROXY: boolean;
    PORT: number;
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
        KOA_KEYS: extractEnvVar('KOA_KEYS').split(/s+/),
        KOA_PROXY: !!extractEnvVar('KOA_PROXY', ''),
        PORT: parseInt(extractEnvVar('PORT', '5000'), 10),
    };
}

const config: Config = extractConfigFromEnv();

const app = new Koa();
app.keys = config.KOA_KEYS;
app.proxy = config.KOA_PROXY;

app.use(mount(appConfig.publicPath, compose([
    serve(path.resolve(__webpack_dirname, appConfig.publicOutputDir), {
        maxage: 365 * 24 * 60 * 60,
    }),
    notFound(),
])));

const server = http.createServer(app.callback());
server.listen(config.PORT, 'localhost');

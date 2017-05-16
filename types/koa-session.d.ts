import * as Koa from 'koa';

declare interface Config {
    /**
     * Cookie key (default is `koa:sess`)
     */
    key?: string;

    /**
     * Max age in ms (default is 1 day)
     */
    maxAge?: number;

    /**
     * Can overwrite or not (default true)
     */
    overwrite?: boolean;

    /**
     * http only or not (default true)
     */
    httpOnly?: boolean;

    /**
     * Signed or not (default true)
     */
    signed?: boolean;
}

declare function session(config: Config, app: Koa): Koa.Middleware;

declare function session(app: Koa): Koa.Middleware;

declare namespace session { }

export = session;

import pathToRegexp from 'path-to-regexp';
import { UrlCtx } from './koa-ctx';

export interface Ctx extends UrlCtx {}

export class Route<T extends {}> {
    private route: string;
    private re: RegExp;
    private keys: pathToRegexp.Key[];
    private toPathFunc: pathToRegexp.PathFunction;

    constructor(route: string) {
        if (!route.startsWith('/')) {
            throw new Error(`route does not start with /: ${JSON.stringify(route)}`);
        }
        this.route = route;
        this.keys = [];
        this.re = pathToRegexp(route, this.keys);
        this.toPathFunc = pathToRegexp.compile(route);
    }

    match(ctx: Ctx, method?: string): T | false {
        if (!methodMatches(ctx.method, method)) {
            return false;
        }
        return this.matchPath(ctx.path);
    }

    matchPath(path: string): T | false {
        const result = this.re.exec(path);
        if (!result) {
            return false;
        }

        const out: {[key: string]: string | string[] | undefined} = {};
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[i];
            const value: string | undefined = result[i + 1];
            if (key.repeat) {
                out[key.name] = value ? value.split(key.delimiter).map(decodeURIComponent) : [];
            } else {
                out[key.name] = decodeURIComponent(value);
            }
        }

        return out as T;
    }

    toPath(data: T, mountPath: string): string {
        const path = this.toPathFunc(data);
        if (path.startsWith('/') && mountPath.endsWith('/')) {
            mountPath = mountPath.substring(0, mountPath.length - 1);
        }
        return `${mountPath}${path}`;
    }

    extend<J extends T>(route: string): Route<J> {
        return new Route<J>(`${this.route}/${route}`);
    }
}

function methodMatches(ctxMethod: string, method?: string): boolean {
    return !method ||
        ctxMethod === method ||
        method === 'GET' && ctxMethod === 'HEAD';
}

export default Route;

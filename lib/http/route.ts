import pathToRegexp from 'path-to-regexp';
import qs from 'querystringify';

export class Route<T extends {}> {
    private route: string;
    private queryKeys: Set<string>;
    private re: RegExp;
    private keys: pathToRegexp.Key[];
    private toPathFunc: pathToRegexp.PathFunction;

    constructor(route: string, queryKeys?: string[]) {
        if (!route.startsWith('/')) {
            throw new Error(`route does not start with /: ${JSON.stringify(route)}`);
        }
        this.route = route;
        this.queryKeys = new Set<string>(queryKeys);
        this.keys = [];
        this.re = pathToRegexp(route, this.keys, {
            sensitive: true,
            strict: true,
        });
        this.toPathFunc = pathToRegexp.compile(route);
    }

    testPath(pathname: string): boolean {
        return this.re.test(pathname);
    }

    matchPath(pathname: string, search: string): T | null {
        const result = this.re.exec(pathname);
        if (!result) {
            return null;
        }

        // Parse pathname
        const out: {[key: string]: string | string[] | undefined} = {};
        for (let i = 0; i < this.keys.length; i++) {
            const key = this.keys[i];
            const value: string | undefined = result[i + 1];
            if (key.repeat) {
                out[key.name] = value ? value.split(key.delimiter).map(decodeURIComponent) : [];
            } else if (typeof value === 'string') {
                out[key.name] = decodeURIComponent(value);
            }
        }

        // Parse query
        const parsedQs = qs.parse(search);
        for (const queryKey of this.queryKeys) {
            if (typeof parsedQs[queryKey] === 'string') {
                out[queryKey] = parsedQs[queryKey];
            }
        }

        return out as T;
    }

    toPath(data: T, mountPath: string): string {
        const path = this.toPathFunc(data);
        if (path.startsWith('/') && mountPath.endsWith('/')) {
            mountPath = mountPath.substring(0, mountPath.length - 1);
        }
        const anyData: any = data;
        const queryObj: {[key: string]: string} = {};
        for (const queryKey of this.queryKeys) {
            if (typeof anyData[queryKey] === 'string') {
                queryObj[queryKey] = anyData[queryKey];
            }
        }
        return `${mountPath}${path}${qs.stringify(queryObj, '?')}`;
    }

    extend<J extends T>(route: string, queryKeys?: string[]): Route<J> {
        const newQueryKeys = Array.from(this.queryKeys);
        newQueryKeys.push(...queryKeys || []);
        return new Route<J>(`${this.route}/${route}`, newQueryKeys);
    }
}

export default Route;

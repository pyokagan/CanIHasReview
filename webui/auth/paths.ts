import url from 'url';
import {
    loginCallbackRoute,
    loginRoute,
} from './routes';

interface GetLoginPathOptions {
    mountPath: string;
    path: string;
    search: string;
}

/**
 * Returns the login path.
 */
export function getLoginPath(opts: GetLoginPathOptions): string {
    const loginPathname = loginRoute.toPath({}, opts.mountPath);
    const redirect = encodeURIComponent(`${opts.path}${opts.search}`);
    return `${loginPathname}?redirect=${redirect}`;
}

interface LoginCallbackUrlOptions {
    protocol: string;
    host: string;
    mountPath: string;
    redirect?: string;
}

/**
 * Return the login callback URL that should be sent to GitHub.
 */
export function getLoginCallbackUrl(opts: LoginCallbackUrlOptions): string {
    return url.format({
        host: opts.host,
        pathname: loginCallbackRoute.toPath({}, opts.mountPath),
        protocol: opts.protocol,
        query: opts.redirect ? { redirect: opts.redirect } : undefined,
        slashes: true,
    });
}

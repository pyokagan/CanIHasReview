import {
    authLoginCallbackRoute,
} from '@webui/routes';

interface LoginCallbackUrlOptions {
    protocol: 'http' | 'https';
    host: string;
    mountPath: string;
    redirect: string | undefined;
}

/**
 * Return the login callback URL that should be sent to GitHub.
 */
export function getLoginCallbackUrl(opts: LoginCallbackUrlOptions): string {
    const path = authLoginCallbackRoute.toPath({ redirect: opts.redirect }, opts.mountPath);
    if (!path.startsWith('/')) {
        throw new Error(`invalid path, should not happen: ${path}`);
    }
    return `${opts.protocol}://${opts.host}${path}`;
}

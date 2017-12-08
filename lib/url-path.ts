/**
 * @module
 * Utilities for dealing with URL paths.
 */
import path from 'path';

/**
 * Resolves `pathname` against `rootFsPath` securely.
 */
export function resolveFsPath(rootFsPath: string, pathname: string): string | undefined {
    if (!path.isAbsolute(rootFsPath)) {
        throw new TypeError(`rootFsPath must be an absolute path: ${rootFsPath}`);
    }

    const pathnameComp = pathname.split('/').map(decodeURIComponent);
    for (const comp of pathnameComp) {
        if (comp.indexOf('\0') >= 0 || comp.indexOf('/') >= 0 || comp.indexOf('\\') >= 0) {
            return;
        }
    }
    const decodedPathname = `./${pathnameComp.join('/')}`;
    const normalizedPath = path.normalize(decodedPathname);
    if (path.isAbsolute(normalizedPath) || normalizedPath === '..' || normalizedPath.startsWith(`..${path.sep}`)) {
        return;
    }

    return path.resolve(rootFsPath, normalizedPath);
}

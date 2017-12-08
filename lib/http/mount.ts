type Request = {
    mountPath: string;
    pathname: string;
};

/**
 * @returns true if the request pathname matched the path.
 */
export async function mount(req: Request, mountpath: string, fn: () => void | Promise<void>): Promise<boolean> {
    const newPathname = matchMountpath(mountpath, req.pathname);
    if (!newPathname) {
        return false;
    }

    const oldMountpath = req.mountPath;
    const oldPathname = req.pathname;
    req.mountPath += mountpath;
    req.pathname = newPathname;
    try {
        await fn();
    } finally {
        req.mountPath = oldMountpath;
        req.pathname = oldPathname;
    }
    return true;
}

/**
 * @returns The modified pathname, or an empty string if the pathname does not match.
 */
function matchMountpath(mountpath: string, pathname: string): string {
    if (!mountpath.startsWith('/')) {
        throw new TypeError(`mountpath must start with /: ${mountpath}`);
    }

    if (mountpath.endsWith('/')) {
        throw new TypeError(`mountpath must not end with /: ${mountpath}`);
    }

    if (!pathname.startsWith(mountpath)) {
        return '';
    }

    const newPathname = pathname.substr(mountpath.length) || '/';
    if (!newPathname.startsWith('/')) {
        return '';
    }

    return newPathname;
}

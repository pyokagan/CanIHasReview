/**
 * @module
 * Cookies support.
 */
import {
    getHeader,
    setHeader,
} from './headers';

/**
 * Returns true if `name` is a valid cookie name according to RFC-6265
 */
export function isValidName(name: string): boolean {
    // Any CHAR (Octets 0-127) except CTLs or separators
    if (name.length <= 0) {
        return false;
    }

    for (let i = 0; i < name.length; i++) {
        const c = name.charCodeAt(i);
        const fail = (c >= 0 && c <= 32) ||
            c === 34 || c === 40 || c === 41 || c === 44 || c === 47 ||
            c === 58 || c === 59 || (c >= 60 && c <= 64) || c === 91 ||
            c === 92 || c === 93 || c === 123 || c === 125 || c === 127;
        if (fail) {
            return false;
        }
    }

    return true;
}

/**
 * Returns true if `value` is a valid cookie value according to RFC-6265
 */
export function isValidValue(value: string): boolean {
    for (let i = 0; i < value.length; i++) {
        if (!isValidValueChar(value.charCodeAt(i))) {
            return false;
        }
    }

    return true;
}

function isValidValueChar(c: number): boolean {
    return c === 0x21 || (c >= 0x23 && c <= 0x2b) ||
        (c >= 0x2d && c <= 0x3a) || (c >= 0x3c && c <= 0x5b) ||
        (c >= 0x5d && c <= 0x7e);
}

/**
 * Extracts cookie from cookie header value.
 */
export function extract(cookieHeader: string, name: string): string | undefined {
    const STATE_MATCH = 0;
    const STATE_FIND_END = 1;
    const STATE_SKIP_SPACES = 2;
    const STATE_NOM_END = 3;

    if (!isValidName(name)) {
        throw new TypeError(`invalid cookie name: ${name}`);
    }

    name = `${name}=`;
    let i: number, j: number, state = STATE_SKIP_SPACES;
    for (i = 0, j = 0; i < cookieHeader.length;) {
        const c = cookieHeader.charCodeAt(i);

        switch (state) {
        case STATE_MATCH:
            // assert: j < name.length since name.length > 0
            if (c !== name.charCodeAt(j)) {
                state = STATE_FIND_END;
                j = 0;
            } else {
                i++;
                j++;
                if (j === name.length) {
                    state = STATE_NOM_END;
                    j = i;
                }
            }
            break;
        case STATE_FIND_END:
            if (c === 59 /* ; */) {
                state = STATE_SKIP_SPACES;
            }
            i++;
            break;
        case STATE_SKIP_SPACES:
            if (c !== 32 /* SP */) {
                state = STATE_MATCH;
            } else {
                i++;
            }
            break;
        case STATE_NOM_END:
            if (c === 59 /* ; */) {
                return cookieHeader.substring(j, i);
            } else if (!isValidValueChar(c)) {
                return;
            } else {
                i++;
            }
            break;
        default:
            throw new Error('unknown state');
        }
    }

    return state === STATE_NOM_END ? cookieHeader.substring(j, i) : undefined;
}

type CookieOptions = {
    path?: string;
    expires?: Date;
    domain?: string;
    httpOnly?: boolean;
    sameSite?: 'strict' | 'lax';
    secure?: boolean;

    /**
     * In milliseconds.
     */
    maxAge?: number;
};

export function stringify(name: string, value: string, options?: CookieOptions): string {
    if (!options) {
        options = {};
    }
    if (!isValidName(name)) {
        throw new TypeError(`invalid cookie name: ${name}`);
    }
    if (!isValidValue(value)) {
        throw new TypeError(`invalid cookie value: ${value}`);
    }
    const expires = options.maxAge ? new Date(Date.now() + options.maxAge) : options.expires;

    let header = `${name}=${value}`;

    if (options.path) {
        header += `; path=${options.path}`;
    }
    if (expires) {
        header += `; expires=${expires.toUTCString()}`;
    }
    if (options.domain) {
        header += `; domain=${options.domain}`;
    }
    if (options.sameSite) {
        header += `; samesite=${options.sameSite}`;
    }
    if (options.secure) {
        header += '; secure';
    }
    if (options.httpOnly) {
        header += '; httponly';
    }

    return header;
}

type GetCookieRequest = {
    headers: {[key: string]: string | string[] | undefined};
};

export function getCookie(req: GetCookieRequest, name: string): string | undefined {
    const cookieHeader = req.headers['cookie'];
    if (typeof cookieHeader !== 'string') {
        return;
    }
    return extract(cookieHeader, name);
}

type SetCookieResponse = {
    headers: Map<string, string[]>;
};

export function setCookie(resp: SetCookieResponse, name: string, value: string, options?: CookieOptions): void {
    const cookieHeaders = getHeader(resp, 'Set-Cookie')
        .filter(header => header.startsWith(`${name}=`));
    cookieHeaders.push(stringify(name, value, options));
    setHeader(resp, 'Set-Cookie', cookieHeaders);
}

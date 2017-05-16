import { checkResponseOk } from './check';
import {
    copyRequestInit,
    Fetch,
    mergeRequestInit,
    RequestInit,
} from './fetch';

/**
 * Extracts links from GitHub API's `Link` header.
 *
 * E.g. `<https://api.github.com/a>; rel="next", <https://api.github.com/b>; rel="last"`
 * will be parsed into
 * `{a: 'https://api.github.com/a', b: 'https://api.github.com/b'}`
 */
function parseLinks(link: string): { [rel: string]: string } {
    const links: { [rel: string]: string } = {};
    link.replace(/<([^>]*)>;\s*rel="([\w]*)\"/g, (m, uri, type) => {
        links[type] = uri;
        return '';
    });

    return links;
}

export async function forEachPage(fetch: Fetch, url: string, init: Readonly<RequestInit>,
        fn: (json: any) => Promise<void> | void): Promise<void> {
    const currentInit = copyRequestInit(init);

    while (true) {
        const resp = await fetch(url, currentInit);
        await checkResponseOk(resp);
        const json = await resp.json();

        const fnRet = fn(json);
        if (fnRet) {
            await fnRet;
        }

        const linkHeaders = resp.headers.get('link');
        if (!linkHeaders) {
            return;
        }

        const links = parseLinks(linkHeaders);
        if (!links.next) {
            return;
        }

        url = links.next;
        mergeRequestInit(currentInit, { method: 'GET' });
    }
}

import { GithubError, ParseError, ServerError } from './errors';
import { Response } from './fetch';

/**
 * Throws a {@link GithubError} if the {@link Response} is not ok.
 */
export async function checkResponseOk(resp: Response): Promise<void> {
    if (resp.status >= 200 && resp.status < 300) {
        return;
    }

    // attempt to get the error message from the JSON body
    const unknownErrorMsg = `Unknown error: fetch returned status ${resp.status}`;
    const err: GithubError = await resp.json().then(json => {
        if (json && typeof json.message === 'string') {
            return new ServerError(json.message, resp.status);
        } else {
            return new ParseError(unknownErrorMsg);
        }
    }).catch(() => {
        return new ParseError(unknownErrorMsg);
    });

    throw err;
}

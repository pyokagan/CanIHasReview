/**
 * @module
 * Test utilities.
 */
import fetchPonyfill from 'fetch-ponyfill';
import {
    createAccessTokenApi,
} from './api';
import {
    Fetch,
} from './fetch';

const { fetch } = fetchPonyfill();
const userAgent = 'CanIHasReview Tests';

export function createApiForTest(mocha: Mocha.IBeforeAndAfterContext): Fetch {
    const GITHUB_TOKEN: string | undefined = process.env['GITHUB_TOKEN'];
    if (!GITHUB_TOKEN) {
        mocha.skip();
    }
    return createAccessTokenApi({
        fetch,
        token: GITHUB_TOKEN!,
        userAgent,
    });
}

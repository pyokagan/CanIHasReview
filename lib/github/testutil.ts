/**
 * @module
 * Test utilities.
 */
import fetchPonyfill from 'fetch-ponyfill';
import { makeGhApi } from './api';
import { Fetch } from './fetch';

const { fetch } = fetchPonyfill();
const userAgent = 'CanIHasReview Tests';

export function makeGhApiForTest(mocha: Mocha.IBeforeAndAfterContext): Fetch {
    const GITHUB_TOKEN: string | undefined = process.env['GITHUB_TOKEN'];
    if (!GITHUB_TOKEN) {
        mocha.skip();
    }
    return makeGhApi({
        fetch,
        token: GITHUB_TOKEN,
        userAgent,
    });
}

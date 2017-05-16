/**
 * @module
 * https://developer.github.com/v3/pulls/review_requests/
 */
import { checkResponseOk } from '../check';
import { JsonValidationError } from '../errors';
import { Fetch } from '../fetch';
import { isPrInfo, PrInfo } from './base';

export async function createPrReviewRequest(fetch: Fetch, owner: string, repo: string, pr: string | number,
        reviewers: string[]): Promise<PrInfo> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const prEncoded = encodeURIComponent(String(pr));
    const url = `repos/${ownerEncoded}/${repoEncoded}/pulls/${prEncoded}/requested_reviewers`;
    const resp = await fetch(url, {
        body: JSON.stringify({reviewers}),
        method: 'POST',
    });
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isPrInfo(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

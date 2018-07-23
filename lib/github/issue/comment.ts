/**
 * @module
 * https://developer.github.com/v3/issues/comments/
 */
import isObjectLike from 'lodash/isObjectLike';
import {
    checkResponseOk,
} from '../check';
import {
    JsonValidationError,
} from '../errors';
import {
    Fetch,
} from '../fetch';
import {
    isMiniPublicUserInfo,
    MiniPublicUserInfo,
} from '../user';

export interface IssueComment {
    id: number;
    body: string;
    user: MiniPublicUserInfo;
}

/**
 * Returns true if `value` implements {@link IssueComment}, false otherwise.
 */
export function isIssueComment(value: any): value is IssueComment {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<IssueComment> = value;
    return typeof obj.id === 'number' &&
        typeof obj.body === 'string' &&
        isMiniPublicUserInfo(obj.user);
}
/**
 * Get an issue comment.
 */
export async function getIssueComment(fetch: Fetch, owner: string, repo: string,
        id: number | string): Promise<IssueComment> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const idEncoded = encodeURIComponent(String(id));
    const url = `repos/${ownerEncoded}/${repoEncoded}/issues/comments/${idEncoded}`;
    const resp = await fetch(url);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isIssueComment(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

/**
 * Post a comment on an issue or pull request.
 */
export async function postIssueComment(fetch: Fetch, owner: string, repo: string,
        nr: string | number, body: string): Promise<IssueComment> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const nrEncoded = encodeURIComponent(String(nr));
    const postBody = JSON.stringify({
        body,
    });
    const url = `repos/${ownerEncoded}/${repoEncoded}/issues/${nrEncoded}/comments`;
    const resp = await fetch(url, {
        body: postBody,
        method: 'POST',
    });
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isIssueComment(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

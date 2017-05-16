/**
 * @module
 * https://developer.github.com/v3/repos/branches/
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
    GithubCommit,
    isGithubCommit,
} from './commit';

/**
 * Represents a branch with additional GitHub-specific info.
 */
export interface GithubBranch {
    name: string;
    commit: GithubCommit;
}

/**
 * Returns true if `value` implements {@link GithubBranch}, false otherwise.
 */
export function isGithubBranch(value: any): value is GithubBranch {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<GithubBranch> = value;
    return typeof obj.name === 'string' &&
        isGithubCommit(obj.commit);
}

/**
 * Get branch info.
 */
export async function getBranch(fetch: Fetch, owner: string, repo: string, name: string): Promise<GithubBranch> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const nameEncoded = encodeURIComponent(name);
    const resp = await fetch(`repos/${ownerEncoded}/${repoEncoded}/branches/${nameEncoded}`);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isGithubBranch(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

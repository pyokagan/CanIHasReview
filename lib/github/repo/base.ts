/**
 * @module
 * https://developer.github.com/v3/repos/
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

export interface RepoInfo {
    id: number;
    name: string;
    full_name: string;
    owner: MiniPublicUserInfo;
    private: boolean;
    description: string | null;
    fork: boolean;
    clone_url: string;
    homepage: string | null;
}

/**
 * Returns true if `value` implements {@link RepoInfo}, false otherwise.
 */
export function isRepoInfo(value: any): value is RepoInfo {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<RepoInfo> = value;
    return typeof obj.id === 'number' &&
        typeof obj.name === 'string' &&
        typeof obj.full_name === 'string' &&
        isMiniPublicUserInfo(obj.owner) &&
        typeof obj.private === 'boolean' &&
        (typeof obj.description === 'string' || obj.description === null) &&
        typeof obj.fork === 'boolean' &&
        typeof obj.clone_url === 'string' &&
        (typeof obj.homepage === 'string' || obj.homepage === null);
}

export async function getRepoInfo(fetch: Fetch, owner: string, repo: string): Promise<RepoInfo> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const resp = await fetch(`repos/${ownerEncoded}/${repoEncoded}`);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isRepoInfo(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

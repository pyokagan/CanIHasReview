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
    html_url: string;
    description: string | null;
    fork: boolean;
    created_at: string;
    updated_at: string;
    pushed_at: string;
    git_url: string;
    ssh_url: string;
    clone_url: string;
    svn_url: string;
    homepage: string | null;
    size: number;
    stargazers_count: number;
    watchers_count: number;
    language: string | null;
    has_issues: boolean;
    has_projects: boolean;
    has_downloads: boolean;
    has_wiki: boolean;
    has_pages: boolean;
    forks_count: number;
    mirror_url: string | null;
    open_issues_count: number;
    default_branch: string;
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
        typeof obj.html_url === 'string' &&
        (typeof obj.description === 'string' || obj.description === null) &&
        typeof obj.fork === 'boolean' &&
        typeof obj.created_at === 'string' &&
        typeof obj.updated_at === 'string' &&
        typeof obj.pushed_at === 'string' &&
        typeof obj.git_url === 'string' &&
        typeof obj.ssh_url === 'string' &&
        typeof obj.clone_url === 'string' &&
        typeof obj.svn_url === 'string' &&
        (typeof obj.homepage === 'string' || obj.homepage === null) &&
        typeof obj.size === 'number' &&
        typeof obj.stargazers_count === 'number' &&
        typeof obj.watchers_count === 'number' &&
        (typeof obj.language === 'string' || obj.language === null) &&
        typeof obj.has_issues === 'boolean' &&
        typeof obj.has_projects === 'boolean' &&
        typeof obj.has_downloads === 'boolean' &&
        typeof obj.has_wiki === 'boolean' &&
        typeof obj.has_pages === 'boolean' &&
        typeof obj.forks_count === 'number' &&
        (typeof obj.mirror_url === 'string' || obj.mirror_url === null) &&
        typeof obj.open_issues_count === 'number' &&
        typeof obj.default_branch === 'string';
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

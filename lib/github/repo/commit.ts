/**
 * @module
 * https://developer.github.com/v3/repos/commits/
 */
import every from 'lodash/every';
import isObjectLike from 'lodash/isObjectLike';
import * as qs from 'querystringify';
import { JsonValidationError } from '../errors';
import { Fetch } from '../fetch';
import {
    CommitIdent,
    CommitParent,
    CommitTree,
    isCommitIdent,
    isCommitParent,
    isCommitTree,
} from '../git';
import { forEachPage } from '../pagination';
import {
    isMiniPublicUserInfo,
    MiniPublicUserInfo,
} from '../user';

/**
 * `GithubCommit.commit` object
 */
interface GithubCommitCommit {
    author: CommitIdent;
    committer: CommitIdent;
    message: string;
    tree: CommitTree;
    comment_count: number;
}

function isGithubCommitCommit(value: any): value is GithubCommitCommit {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<GithubCommitCommit> = value;
    return isCommitIdent(obj.author) &&
        isCommitIdent(obj.committer) &&
        typeof obj.message === 'string' &&
        isCommitTree(obj.tree) &&
        typeof obj.comment_count === 'number';
}

/**
 * Represents a commit with additional GitHub-specific info.
 */
export interface GithubCommit {
    sha: string;
    commit: GithubCommitCommit;
    author: MiniPublicUserInfo | null;
    committer: MiniPublicUserInfo | null;
    parents: CommitParent[];
    html_url: string;
}

/**
 * Returns true if `value` implements {@link GithubCommit}.
 */
export function isGithubCommit(value: any): value is GithubCommit {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<GithubCommit> = value;
    return typeof obj.sha === 'string' &&
        isGithubCommitCommit(obj.commit) &&
        (obj.author === null || isMiniPublicUserInfo(obj.author)) &&
        (obj.committer === null || isMiniPublicUserInfo(obj.committer)) &&
        Array.isArray(obj.parents) &&
        every(obj.parents.map(isCommitParent)) &&
        typeof obj.html_url === 'string';
}

interface ListRepoCommitsOpts {
    /**
     * SHA or branch to start listing commits from.
     * Default: the repository's default branch (usually `master`).
     */
    sha?: string;

    /**
     * Only commits containing this file path will be returned.
     */
    path?: string;

    /**
     * GitHub login or email address by which to filter by commit author.
     */
    author?: string;

    /**
     * Only commits after this date will be returned.
     * This is a timestamp in ISO8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
     */
    since?: string;

    /**
     * Only commits before this date will be returned.
     * This is a timestamp in ISO8601 format: `YYYY-MM-DDTHH:MM:SSZ`.
     */
    until?: string;

    per_page?: number;
}

type ForEachRepoCommitCallback = (c: GithubCommit) => (void | Promise<void>);

/**
 * Calls `fn` for each commit in a repository.
 */
export function forEachRepoCommit(fetch: Fetch, owner: string, repo: string,
    options: ListRepoCommitsOpts, fn: ForEachRepoCommitCallback): Promise<void>;

/**
 * Calls `fn` for each commit in a repository.
 */
export function forEachRepoCommit(fetch: Fetch, owner: string,
    repo: string, fn: ForEachRepoCommitCallback): Promise<void>;

export async function forEachRepoCommit(fetch: Fetch, owner: string, repo: string,
        optsOrFn: any, fn?: ForEachRepoCommitCallback): Promise<void> {
    const opts: ListRepoCommitsOpts = fn ? optsOrFn : {};
    const callback: ForEachRepoCommitCallback = fn || optsOrFn;
    const query = qs.stringify(opts);
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const url = `repos/${ownerEncoded}/${repoEncoded}/commits${query ? '?' : ''}${query}`;
    await forEachPage(fetch, url, {}, async (json) => {
        if (!Array.isArray(json) || !every(json.map(isGithubCommit))) {
            throw new JsonValidationError(json);
        }

        for (const commit of json) {
            const result = callback(commit);
            if (result) {
                await result;
            }
        }
    });
}

/**
 * Returns repo commits.
 */
export async function getRepoCommits(fetch: Fetch, owner: string, repo: string,
        opts?: ListRepoCommitsOpts): Promise<GithubCommit[]> {
    const commits: GithubCommit[] = [];
    await forEachRepoCommit(fetch, owner, repo, opts || {}, commit => {
        commits.push(commit);
    });
    return commits;
}

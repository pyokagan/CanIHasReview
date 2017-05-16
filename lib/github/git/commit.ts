/**
 * @module
 * https://developer.github.com/v3/git/commits/
 */
import every from 'lodash/every';
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

/**
 * Author/committer identification.
 */
export interface CommitIdent {
    name: string;
    email: string;
    date: string;
}

/**
 * Returns true if `value` implements {@link CommitIdent}, false otherwise.
 */
export function isCommitIdent(value: any): value is CommitIdent {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<CommitIdent> = value;
    return typeof obj.name === 'string' &&
        typeof obj.email === 'string' &&
        typeof obj.date === 'string';
}

/**
 * Commit tree
 */
export interface CommitTree {
    sha: string;
}

/**
 * Returns true if `value` implements {@link CommitTree}, false otherwise.
 */
export function isCommitTree(value: any): value is CommitTree {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<CommitTree> = value;
    return typeof obj.sha === 'string';
}

/**
 * Commit parent
 */
export interface CommitParent {
    sha: string;
}

/**
 * Returns true if `value` implements {@link CommitParent}, false otherwise.
 */
export function isCommitParent(value: any): value is CommitParent {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<CommitParent> = value;
    return typeof obj.sha === 'string';
}

/**
 * Git commit.
 */
export interface Commit {
    sha: string;
    author: CommitIdent;
    committer: CommitIdent;
    message: string;
    tree: CommitTree;
    parents: CommitParent[];
}

export function isCommit(value: any): value is Commit {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<Commit> = value;
    return typeof obj.sha === 'string' &&
        isCommitIdent(obj.author) &&
        isCommitIdent(obj.committer) &&
        typeof obj.message === 'string' &&
        isCommitTree(obj.tree) &&
        Array.isArray(obj.parents) &&
        every(obj.parents.map(isCommitParent));
}

/**
 * Get a commit.
 */
export async function getCommit(fetch: Fetch, owner: string, repo: string, sha: string): Promise<Commit> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const shaEncoded = encodeURIComponent(sha);
    const resp = await fetch(`repos/${ownerEncoded}/${repoEncoded}/git/commits/${shaEncoded}`);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isCommit(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

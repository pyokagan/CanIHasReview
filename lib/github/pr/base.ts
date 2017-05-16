/**
 * @module
 * https://developer.github.com/v3/pulls/
 */
import every from 'lodash/every';
import isObjectLike from 'lodash/isObjectLike';
import * as qs from 'querystringify';
import { checkResponseOk } from '../check';
import { JsonValidationError } from '../errors';
import { Fetch } from '../fetch';
import { forEachPage } from '../pagination';
import { isRepoInfo, RepoInfo } from '../repo';
import { GithubCommit, isGithubCommit } from '../repo';
import { isMiniPublicUserInfo, MiniPublicUserInfo } from '../user';

interface RepoRef {
    label: string;
    ref: string;
    /**
     * This is the SHA of `ref` *at the time where the PR was created or updated*,
     * and may not be the current value of `ref`.
     */
    sha: string;
    user: MiniPublicUserInfo;
    repo: RepoInfo;
}

function isRepoRef(value: any): value is RepoRef {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<RepoRef> = value;
    return typeof obj.label === 'string' &&
        typeof obj.ref === 'string' &&
        typeof obj.sha === 'string' &&
        isMiniPublicUserInfo(obj.user) &&
        isRepoInfo(obj.repo);
}

const PrState_obj = {
    closed: 0,
    open: 0,
};
export type PrState = keyof typeof PrState_obj;
export const PrState = Object.keys(PrState_obj) as PrState[];

export interface PrInfo {
    id: number;
    number: number;
    state: PrState;
    title: string;
    body: string;
    assignee: MiniPublicUserInfo | null;
    assignees: MiniPublicUserInfo[];
    milestone: {} | null;
    locked: boolean;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    merged_at: string | null;
    head: RepoRef;
    base: RepoRef;
    user: MiniPublicUserInfo;
    merge_commit_sha: string;
    merged: boolean;
    mergeable: boolean | null;
    rebaseable: boolean | null;
    merged_by: MiniPublicUserInfo | null;
    comments: number;
    review_comments: number;
    commits: number;
    additions: number;
    deletions: number;
    changed_files: number;
    maintainer_can_modify: boolean;
    requested_reviewers: any[];
    html_url: string;
}

/**
 * Returns true if `value` implements {@link PrInfo}, false otherwise.
 */
export function isPrInfo(value: any): value is PrInfo {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<PrInfo> = value;
    return typeof obj.id === 'number' &&
        typeof obj.number === 'number' &&
        typeof obj.state === 'string' &&
        PrState.indexOf(obj.state) >= 0 &&
        typeof obj.title === 'string' &&
        typeof obj.body === 'string' &&
        (isMiniPublicUserInfo(obj.assignee) || obj.assignee === null) &&
        Array.isArray(obj.assignees) &&
        every(obj.assignees, isMiniPublicUserInfo) &&
        (isObjectLike(obj.milestone) || obj.milestone === null) &&
        typeof obj.locked === 'boolean' &&
        typeof obj.created_at === 'string' &&
        typeof obj.updated_at === 'string' &&
        (typeof obj.closed_at === 'string' || obj.closed_at === null) &&
        (typeof obj.merged_at === 'string' || obj.merged_at === null) &&
        isRepoRef(obj.head) &&
        isRepoRef(obj.base) &&
        isMiniPublicUserInfo(obj.user) &&
        typeof obj.merge_commit_sha === 'string' &&
        typeof obj.merged === 'boolean' &&
        (typeof obj.mergeable === 'boolean' || obj.mergeable === null) &&
        (typeof obj.rebaseable === 'boolean' || obj.rebaseable === null) &&
        (isMiniPublicUserInfo(obj.merged_by) || obj.merged_by === null) &&
        typeof obj.comments === 'number' &&
        typeof obj.review_comments === 'number' &&
        typeof obj.commits === 'number' &&
        typeof obj.additions === 'number' &&
        typeof obj.deletions === 'number' &&
        typeof obj.changed_files === 'number' &&
        typeof obj.maintainer_can_modify === 'boolean' &&
        Array.isArray(obj.requested_reviewers) &&
        typeof obj.html_url === 'string';
}

export async function getPrInfo(fetch: Fetch, owner: string, repo: string, pr: number | string): Promise<PrInfo> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const prEncoded = encodeURIComponent(String(pr));
    const resp = await fetch(`repos/${ownerEncoded}/${repoEncoded}/pulls/${prEncoded}`);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isPrInfo(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

interface ForEachPrCommitOpts {
    per_page?: number;
}

type ForEachPrCommitCallback = (commit: GithubCommit) => (Promise<void> | void);

/**
 * Calls `fn` for every PR commit.
 */
export function forEachPrCommit(fetch: Fetch, owner: string, repo: string, pr: number | string,
    opts: ForEachPrCommitOpts, fn: ForEachPrCommitCallback): Promise<void>;
export function forEachPrCommit(fetch: Fetch, owner: string, repo: string,
    pr: number | string, fn: ForEachPrCommitCallback): Promise<void>;
export async function forEachPrCommit(fetch: Fetch, owner: string, repo: string, pr: number | string,
        optsOrFn: any, fn?: ForEachPrCommitCallback): Promise<void> {
    const opts = fn ? optsOrFn : {};
    const callback = fn || optsOrFn;
    const query = qs.stringify(opts);
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const prEncoded = encodeURIComponent(String(pr));
    const url = `repos/${ownerEncoded}/${repoEncoded}/pulls/${prEncoded}/commits${query ? '?' : ''}${query}`;
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
 * Get PR commits.
 */
export async function getPrCommits(fetch: Fetch, owner: string, repo: string,
        pr: number | string, opts?: ForEachPrCommitOpts): Promise<GithubCommit[]> {
    const commits: GithubCommit[] = [];
    await forEachPrCommit(fetch, owner, repo, pr, opts || {}, commit => {
        commits.push(commit);
    });
    return commits;
}

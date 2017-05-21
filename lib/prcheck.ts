/**
 * PR checks.
 */
import has from 'lodash/has';
import {
    Fetch,
    getBranch,
    getPrCommits,
    getPrInfo,
} from './github';

export interface PrCheckResult {
    [sha: string]: string[] | undefined;
}

export type PrCheck = (fetch: Fetch, owner: string, repo: string, pr: number) => Promise<PrCheckResult>;

function pushErrors(result: PrCheckResult, sha: string, messages: string[] | string): void {
    const arr = result[sha] = (result[sha] || []);
    if (Array.isArray(messages)) {
        arr.push.apply(result[sha], messages);
    } else {
        arr.push(messages);
    }
}

/**
 * Mapping between PrCheck names and the PrCheck.
 */
export const prChecks: {[name: string]: PrCheck} = {
    'no-merge-commits': checkForMergeCommits,
    'no-out-of-date': checkOutOfDate,
    'too-many-commits': checkTooManyCommits,
};

/**
 * Runs a default (permissive) set of checks.
 */
export const runDefaultChecks = compose([
    checkTooManyCommits,
    checkForMergeCommits,
]);

/**
 * Rejects if the PR has too many commits.
 */
export async function checkTooManyCommits(fetch: Fetch, owner: string,
        repo: string, pr: number): Promise<PrCheckResult> {
    const prInfo = await getPrInfo(fetch, owner, repo, pr);
    const commits = await getPrCommits(fetch, owner, repo, pr);
    return commits.length !== prInfo.commits ? {'': ['Too many commits']} : {};
}

/**
 * Rejects any merge commit(s) in the PR.
 */
export async function checkForMergeCommits(fetch: Fetch, owner: string,
        repo: string, pr: number): Promise<PrCheckResult> {
    const commits = await getPrCommits(fetch, owner, repo, pr);

    let hasMergeCommit = false;
    const result: PrCheckResult = {};

    commits.forEach(commit => {
        if (commit.parents.length !== 1) {
            pushErrors(result, commit.sha, 'Merge commit');
            hasMergeCommit = true;
        }
    });

    if (hasMergeCommit) {
        pushErrors(result, '', 'PR contains merge commit(s)');
    }

    return result;
}

/**
 * Rejects the PR if it is out of date with its base branch.
 */
export async function checkOutOfDate(fetch: Fetch, owner: string, repo: string, pr: number): Promise<PrCheckResult> {
    const commits = await getPrCommits(fetch, owner, repo, pr);
    if (!commits.length) {
        return {};
    }

    const prInfo = await getPrInfo(fetch, owner, repo, pr);
    const baseBranch = await getBranch(fetch, prInfo.base.user.login, prInfo.base.repo.name, prInfo.base.ref);

    for (const commit of commits) {
        if (commit.parents[0].sha === baseBranch.commit.sha) {
            return {};
        }
    }

    return {'': [`PR not up to date with base (${baseBranch.name}) head. Rebase required.`]};
}

/**
 * Compose {@link PrCheck} together.
 */
export function compose(checks: (PrCheck | string)[]): PrCheck {
    const resolvedChecks = new Set<PrCheck>(checks.map(x => {
        if (typeof x !== 'string') {
            return x;
        } else if (!(x in prChecks)) {
            throw new Error(`invalid check name ${x}`);
        }
        return prChecks[x];
    }));

    return async (fetch, owner, repo, pr) => {
        const result: PrCheckResult = {};

        for (const prCheck of resolvedChecks) {
            mergePrCheckResult(result, await prCheck(fetch, owner, repo, pr));
        }

        return result;
    };
}

export function mergePrCheckResult(dst: PrCheckResult, src: Readonly<PrCheckResult>): void {
    for (const key in src) {
        if (!has(src, key)) {
            continue;
        }
        const arr = src[key];
        if (!arr) {
            continue;
        }
        pushErrors(dst, key, arr);
    }
}

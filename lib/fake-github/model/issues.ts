import * as git from '@lib/git';
import {
    GithubCommit,
    IssueComment,
    PrInfo,
} from '@lib/github';
import {
    SimpleShell,
} from '@lib/shell';
import fs from 'fs-extra';
import path from 'path';
import {
    GithubModel,
} from './ctx';
import {
    JsonValidationError,
} from './errors';
import {
    getRepoDir,
    getRepoInfo,
} from './repo';
import {
    getMiniPublicUserInfo,
} from './user';
import {
    gitCommitToGithubCommit,
} from './util';

interface DiskIssueComment {
    body: string;
    user: string;
}

function isDiskIssueComment(val: any): val is DiskIssueComment {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskIssueComment> = val;
    return typeof obj.body === 'string' &&
        typeof obj.user === 'string';
}

function isDiskIssueCommentArray(val: any): val is DiskIssueComment[] {
    return Array.isArray(val) &&
        val.every(x => isDiskIssueComment(x));
}

interface DiskIssuePr {
    state: 'closed' | 'open';
    title: string;
    body: string;
    comments: DiskIssueComment[];
}

function isDiskIssuePr(val: any): val is DiskIssuePr {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskIssuePr> = val;
    return (obj.state === 'closed' || obj.state === 'open') &&
        typeof obj.title === 'string' &&
        typeof obj.body === 'string' &&
        isDiskIssueCommentArray(obj.comments);
}

interface DiskIssue extends DiskIssuePr {
    type: 'issue';
}

function isDiskIssue(val: any): val is DiskIssue {
    if (!isDiskIssuePr(val)) {
        return false;
    }

    const obj: Partial<DiskIssue> = val;
    return obj.type === 'issue';
}

interface DiskPr extends DiskIssuePr {
    type: 'pr';
    head: string;
    base: string;
    user: string;
    merged: boolean;
}

function isDiskPr(val: any): val is DiskPr {
    if (!isDiskIssuePr(val)) {
        return false;
    }

    const obj: Partial<DiskPr> = val;
    return obj.type === 'pr' &&
        typeof obj.head === 'string' &&
        typeof obj.base === 'string' &&
        typeof obj.user === 'string' &&
        typeof obj.merged === 'boolean';
}

export function getIssuesDir(dir: string, owner: string, repo: string): string {
    return path.join(getRepoDir(dir, owner, repo), 'issues');
}

export function getIssuePath(dir: string, owner: string, repo: string, nr: number | string): string {
    return path.join(getIssuesDir(dir, owner, repo), `${nr}.json`);
}

export function hasIssue(ctx: GithubModel, owner: string, repo: string, nr: number): Promise<boolean> {
    return fs.pathExists(getIssuePath(ctx.dir, owner, repo, nr));
}

async function readIssue(dir: string, owner: string, repo: string, nr: number | string): Promise<DiskIssue | DiskPr> {
    const data = await fs.readJson(getIssuePath(dir, owner, repo, nr));
    if (isDiskIssue(data)) {
        return data;
    } else if (isDiskPr(data)) {
        return data;
    } else {
        throw new JsonValidationError(data);
    }
}

async function writeIssue(dir: string, owner: string,
        repo: string, nr: number | string, data: DiskIssue | DiskPr): Promise<void> {
    await fs.mkdirs(getIssuesDir(dir, owner, repo));
    await fs.writeJson(getIssuePath(dir, owner, repo, nr), data, { spaces: 2 });
}

export async function listIssues(ctx: GithubModel, owner: string, repo: string): Promise<number[]> {
    const issuesDir = getIssuesDir(ctx.dir, owner, repo);
    if (!(await fs.pathExists(issuesDir))) {
        return [];
    }
    return (await fs.readdir(issuesDir))
        .filter(filename => /^[0-9]+\.json$/.test(filename))
        .map(filename => parseInt(filename.substring(0, filename.length - '.json'.length)));
}

export async function createIssue(ctx: GithubModel, owner: string, repo: string): Promise<number> {
    const largestId = Math.max(0, ...(await listIssues(ctx, owner, repo)));
    const nr = largestId + 1;
    await writeIssue(ctx.dir, owner, repo, nr, {
        body: 'issue body',
        comments: [],
        state: 'open',
        title: 'issue title',
        type: 'issue',
    });
    return nr;
}

export async function createPr(ctx: GithubModel, owner: string,
        repo: string, base: string, head: string, user?: string): Promise<number> {
    const largestId = Math.max(0, ...(await listIssues(ctx, owner, repo)));
    const nr = largestId + 1;
    const [headOwner] = splitOwnerRepoBranch(head, owner, repo);
    const myUser = user || headOwner;
    await writeIssue(ctx.dir, owner, repo, nr, {
        base,
        body: 'PR body',
        comments: [],
        head,
        merged: false,
        state: 'open',
        title: 'PR title',
        type: 'pr',
        user: myUser,
    });
    return nr;
}

export async function getPrInfo(ctx: GithubModel, owner: string, repo: string, nr: number): Promise<PrInfo> {
    const data = await readIssue(ctx.dir, owner, repo, nr);
    if (data.type !== 'pr') {
        throw new Error(`is an issue: ${nr}`);
    }

    const [baseOwner, baseRepo, baseBranch] = splitOwnerRepoBranch(data.base, owner, repo);
    const [headOwner, headRepo, headBranch] = splitOwnerRepoBranch(data.head, owner, repo);
    const user = await getMiniPublicUserInfo(ctx, data.user);

    return {
        base: {
            ref: baseBranch,
            repo: await getRepoInfo(ctx, baseOwner, baseRepo),
            user: await getMiniPublicUserInfo(ctx, baseOwner),
        },
        body: data.body,
        commits: 1,
        head: {
            ref: headBranch,
            repo: await getRepoInfo(ctx, headOwner, headRepo),
            user: await getMiniPublicUserInfo(ctx, headOwner),
        },
        id: 0, // TODO: remove ID
        locked: false,
        maintainer_can_modify: true,
        merged: data.merged,
        merged_by: null,
        number: nr,
        state: data.state,
        title: data.title,
        user,
    };
}

function splitOwnerRepoBranch(val: string, defaultOwner: string, defaultRepo: string): [string, string, string] {
    const colonIdx = val.indexOf(':');
    if (colonIdx < 0) {
        return [defaultOwner, defaultRepo, val];
    }
    const ownerRepoPart = val.substring(0, colonIdx);
    const branch = val.substring(colonIdx + 1);

    const slashIdx = ownerRepoPart.indexOf('/');
    if (slashIdx < 0) {
        return [ownerRepoPart, defaultRepo, branch];
    }

    const owner = ownerRepoPart.substring(0, slashIdx);
    const repo = ownerRepoPart.substring(slashIdx + 1);
    return [owner, repo, branch];
}

export async function getPrCommits(ctx: GithubModel, owner: string, repo: string, nr: number): Promise<GithubCommit[]> {
    const info = await readIssue(ctx.dir, owner, repo, nr);
    if (info.type !== 'pr') {
        throw new Error(`not a pr: ${nr}`);
    }
    const [baseOwner, baseRepo, baseBranch] = splitOwnerRepoBranch(info.base, owner, repo);
    const [headOwner, headRepo, headBranch] = splitOwnerRepoBranch(info.head, owner, repo);
    const baseRepoDir = path.resolve(getRepoDir(ctx.dir, baseOwner, baseRepo));
    const headRepoDir = path.resolve(getRepoDir(ctx.dir, headOwner, headRepo));
    const shell = new SimpleShell({ cwd: ctx.workDir });
    await shell.checkCall('git', ['fetch', baseRepoDir, baseBranch]);
    await shell.checkCall('git', ['branch', 'base', 'FETCH_HEAD']);
    try {
        await shell.checkCall('git', ['fetch', headRepoDir, headBranch]);
        const commits = await git.log(shell, ['base..FETCH_HEAD']);
        return commits.map(gitCommitToGithubCommit);
    } finally {
        await shell.checkCall('git', ['branch', '-D', 'base']);
    }
}

export async function getIssueComments(ctx: GithubModel, owner: string,
        repo: string, nr: number): Promise<IssueComment[]> {
    const info = await readIssue(ctx.dir, owner, repo, nr);
    const out: IssueComment[] = [];
    for (const data of info.comments) {
        out.push({
            body: data.body,
            id: 0,
            user: await getMiniPublicUserInfo(ctx, data.user),
        });
    }
    return out;
}

export async function addIssueComment(ctx: GithubModel, owner: string,
        repo: string, nr: number, body: string, user: string): Promise<IssueComment> {
    const diskIssueComment: DiskIssueComment = {
        body,
        user,
    };
    const data = await readIssue(ctx.dir, owner, repo, nr);
    data.comments.push(diskIssueComment);
    await writeIssue(ctx.dir, owner, repo, nr, data);
    return {
        body: diskIssueComment.body,
        id: 0,
        user: await getMiniPublicUserInfo(ctx, diskIssueComment.user),
    };
}

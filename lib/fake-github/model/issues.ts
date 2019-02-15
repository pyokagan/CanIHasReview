import * as git from '@lib/git';
import { GithubCommit, IssueComment, PrInfo } from '@lib/github';
import { SimpleShell } from '@lib/shell';
import * as sqlite3 from '@lib/sqlite3-promise';
import path from 'path';
import { GithubModel } from './ctx';
import { JsonValidationError } from './errors';
import { getRepoDir, getRepoId, getRepoInfo } from './repo';
import { getMiniPublicUserInfo, getUserId, getUserLogin } from './user';
import { gitCommitToGithubCommit } from './util';

interface DiskIssueComment {
    id: number;
    issueid: number;
    userid: number;
    body: string;
    user: string;
}

function isDiskIssueComment(val: any): val is DiskIssueComment {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskIssueComment> = val;
    return typeof obj.id === 'number' &&
        typeof obj.issueid === 'number' &&
        typeof obj.userid === 'number' &&
        typeof obj.body === 'string' &&
        typeof obj.user === 'string';
}

interface DiskIssuePr {
    id: number;
    repoid: number;
    nr: number;
    userid: number;
    title: string;
    body: string;
    state: 'closed' | 'open';
}

function isDiskIssuePr(val: any): val is DiskIssuePr {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskIssuePr> = val;
    return typeof obj.id === 'number' &&
        typeof obj.repoid === 'number' &&
        typeof obj.nr === 'number' &&
        typeof obj.userid === 'number' &&
        typeof obj.title === 'string' &&
        typeof obj.body === 'string' &&
        (obj.state === 'closed' || obj.state === 'open');
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
    merged: number;
}

function isDiskPr(val: any): val is DiskPr {
    if (!isDiskIssuePr(val)) {
        return false;
    }

    const obj: Partial<DiskPr> = val;
    return obj.type === 'pr' &&
        typeof obj.head === 'string' &&
        typeof obj.base === 'string' &&
        typeof obj.merged === 'number';
}

async function getIssueId(ctx: GithubModel, owner: string, repo: string, nr: number): Promise<number | undefined> {
    const obj = await sqlite3.get(ctx.db, `select id from issues
        where nr = ?
        and repoid = (select id from repos where name = ? and userid = (select id from users where login = ?))`,
        [nr, repo, owner]);
    if (!obj) {
        return obj;
    }
    if (typeof obj.id !== 'number') {
        throw new JsonValidationError(obj);
    }
    return obj.id;
}

export async function hasIssue(ctx: GithubModel, owner: string, repo: string, nr: number): Promise<boolean> {
    return typeof (await getIssueId(ctx, owner, repo, nr)) === 'number';
}

async function readIssue(ctx: GithubModel, owner: string,
        repo: string, nr: number | string): Promise<DiskIssue | DiskPr> {
    const obj = await sqlite3.get(ctx.db, `select * from issues
        where nr = ?
        and repoid = (select id from repos where name = ? and userid = (select id from users where login = ?))`,
        [nr, repo, owner]);
    if (!obj) {
        throw new Error(`no such issues: ${owner}/${repo}/${nr}`);
    }
    if (isDiskIssue(obj)) {
        return obj;
    } else if (isDiskPr(obj)) {
        return obj;
    } else {
        throw new JsonValidationError(obj);
    }
}

export async function listIssues(ctx: GithubModel, owner: string, repo: string): Promise<number[]> {
    const objs = await sqlite3.all(ctx.db, `select nr from issues
        where repoid = (select id from repos where name = ? and userid = (select id from users where login = ?))`,
        [repo, owner]);
    const out: number[] = [];
    for (const obj of objs) {
        if (typeof obj.nr !== 'number') {
            throw new JsonValidationError(obj);
        }
        out.push(obj.nr);
    }
    return out;
}

async function getLargestIssueId(ctx: GithubModel, repoId: number): Promise<number> {
    const obj = await sqlite3.get(ctx.db, `select max(issues.nr) as maxnr from issues
        where issues.repoid = ?`,
        [repoId]);
    if (!obj || obj.maxnr === null) {
        return 0;
    }
    if (typeof obj.maxnr !== 'number') {
        throw new JsonValidationError(obj);
    }
    return obj.maxnr;
}

export async function createIssue(ctx: GithubModel, owner: string, repo: string, user?: string): Promise<number> {
    const repoId = await getRepoId(ctx, owner, repo);
    if (!repoId) {
        throw new Error(`no such repo: ${owner}/${repo}`);
    }
    const largestId = await getLargestIssueId(ctx, repoId);
    const nr = largestId + 1;
    const userId = await (async () => {
        if (!user) {
            return null;
        }
        const uid = await getUserId(ctx, user);
        if (typeof uid === 'undefined') {
            throw new Error(`no such user: ${user}`);
        }
        return uid;
    })();
    await sqlite3.run(ctx.db, `insert into issues(repoid, nr, type, userid) values(?, ?, ?, ?)`,
        [repoId, nr, 'issue', userId]);
    return nr;
}

export async function createPr(ctx: GithubModel, owner: string,
        repo: string, base: string, head: string, user?: string): Promise<number> {
    const repoId = await getRepoId(ctx, owner, repo);
    if (!repoId) {
        throw new Error(`no such repo: ${owner}/${repo}`);
    }
    const largestId = await getLargestIssueId(ctx, repoId);
    const nr = largestId + 1;
    const [headOwner] = splitOwnerRepoBranch(head, owner, repo);
    if (!user) {
        user = headOwner;
    }
    const userId = await getUserId(ctx, user);
    if (typeof userId === 'undefined') {
        throw new Error(`no such user: ${user}`);
    }
    await sqlite3.run(ctx.db,
        `insert into issues(repoid, nr, type, userid, head, base) values(?, ?, ?, ?, ?, ?)`,
        [repoId, nr, 'pr', userId, head, base]);
    return nr;
}

export async function getPrInfo(ctx: GithubModel, owner: string, repo: string, nr: number): Promise<PrInfo> {
    const data = await readIssue(ctx, owner, repo, nr);
    if (data.type !== 'pr') {
        throw new Error(`is an issue: ${nr}`);
    }

    const [baseOwner, baseRepo, baseBranch] = splitOwnerRepoBranch(data.base, owner, repo);
    const [headOwner, headRepo, headBranch] = splitOwnerRepoBranch(data.head, owner, repo);
    const user = await getMiniPublicUserInfo(ctx, await getUserLogin(ctx, data.userid));

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
        merged: !!data.merged,
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
    const info = await readIssue(ctx, owner, repo, nr);
    if (info.type !== 'pr') {
        throw new Error(`not a pr: ${nr}`);
    }
    const [baseOwner, baseRepo, baseBranch] = splitOwnerRepoBranch(info.base, owner, repo);
    const [headOwner, headRepo, headBranch] = splitOwnerRepoBranch(info.head, owner, repo);
    const baseRepoDir = path.resolve(await getRepoDir(ctx, baseOwner, baseRepo));
    const headRepoDir = path.resolve(await getRepoDir(ctx, headOwner, headRepo));
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

export async function readIssueComments(ctx: GithubModel, owner: string,
        repo: string, nr: number): Promise<DiskIssueComment[]> {
    const objs = await sqlite3.all(ctx.db, `select * from issue_comments
    where issue_id = (select id from issues where nr = ?
        and repoid = (select id from repos where name = ?
            and userid = (select id from users where login = ?)))`,
            [nr, repo, owner]);
    const out: DiskIssueComment[] = [];
    for (const obj of objs) {
        if (!isDiskIssueComment(obj)) {
            throw new JsonValidationError(obj);
        }
        out.push(obj);
    }
    return out;
}

export async function getIssueComments(ctx: GithubModel, owner: string,
        repo: string, nr: number): Promise<IssueComment[]> {
    const objs = await readIssueComments(ctx, owner, repo, nr);
    const out: IssueComment[] = [];
    for (const obj of objs) {
        out.push({
            body: obj.body,
            id: obj.id,
            user: await getMiniPublicUserInfo(ctx, await getUserLogin(ctx, obj.userid)),
        });
    }
    return out;
}

export async function addIssueComment(ctx: GithubModel, owner: string,
        repo: string, nr: number, body: string, author: string): Promise<IssueComment> {
    const issueId = await getIssueId(ctx, owner, repo, nr);
    if (!issueId) {
        throw new Error(`no such issue: ${owner}/${repo}/${nr}`);
    }
    const authorId = await getUserId(ctx, author);
    if (!authorId) {
        throw new Error(`no such user: ${author}`);
    }
    const id = await sqlite3.runWithRowId(ctx.db,
        `insert into issue_comments(issueid, userid, body) values(?, ?, ?)`,
        [issueId, authorId, body]);
    return {
        body,
        id,
        user: await getMiniPublicUserInfo(ctx, author),
    };
}

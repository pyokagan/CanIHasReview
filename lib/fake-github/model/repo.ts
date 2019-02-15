import * as git from '@lib/git';
import { cloneRepo as gitCloneRepo, GitShell, TmpGitRepo } from '@lib/git/testutil';
import { Commit, GithubBranch, RepoInfo } from '@lib/github';
import { checkCall } from '@lib/shell';
import * as sqlite3 from '@lib/sqlite3-promise';
import path from 'path';
import { GithubModel } from './ctx';
import { JsonValidationError } from './errors';
import { getPublicUserInfo, getUserId } from './user';
import { gitCommitToGithubCommit } from './util';

export interface DiskRepoInfo {
    id: number;
    userid: number;
    name: string;
    private: number;
    description: string | null;
    fork: number;
    homepage: string | null;
}

export function isDiskRepoInfo(val: any): val is DiskRepoInfo {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskRepoInfo> = val;
    return typeof obj.id === 'number' &&
        typeof obj.userid === 'number' &&
        typeof obj.name === 'string' &&
        typeof obj.private === 'number' &&
        (typeof obj.description === 'string' || obj.description === null) &&
        typeof obj.fork === 'number' &&
        (typeof obj.homepage === 'string' || obj.homepage === null);
}

export async function getRepoId(ctx: GithubModel, owner: string, name: string): Promise<number | undefined> {
    const obj = await sqlite3.get(ctx.db,
        `select id from repos where name = ? and userid = (select id from users where login = ?)`,
        [name, owner]);
    if (!obj) {
        return obj;
    }
    if (typeof obj !== 'object' || typeof obj.id !== 'number') {
        throw new JsonValidationError(obj);
    }
    return obj.id;
}

export async function getRepoDir(ctx: GithubModel, owner: string, name: string): Promise<string> {
    const id = await getRepoId(ctx, owner, name);
    if (typeof id === 'undefined') {
        throw new Error(`no such repo: ${owner}/${name}`);
    }
    return path.join(ctx.dir, 'repos', `${id}`);
}

export async function hasRepo(ctx: GithubModel, owner: string, name: string): Promise<boolean> {
    return typeof (await getRepoId(ctx, owner, name)) === 'number';
}

export async function readRepoInfo(db: sqlite3.Database, owner: string, name: string): Promise<DiskRepoInfo> {
    const obj = await sqlite3.get(db,
        `select * from repos where name = ? and userid = (select id from users where login = ?)`,
        [name, owner]);
    if (!obj) {
        throw new Error(`no such repo: ${owner}/${name}`);
    }
    if (!isDiskRepoInfo(obj)) {
        throw new JsonValidationError(obj);
    }
    return obj;
}

export async function writeRepoInfo(db: sqlite3.Database, data: DiskRepoInfo): Promise<void> {
    await sqlite3.run(db,
        `update repos set userid=?, name=?, description=?, private=?, fork=?, homepage=? where id=?`, [
        data.userid,
        data.name,
        data.description,
        data.private,
        data.fork,
        data.homepage,
        data.id,
    ]);
}

export async function listRepos(ctx: GithubModel, owner: string): Promise<string[]> {
    const objs = await sqlite3.all(ctx.db,
        `select name from repos where userid = (select id from users where login = ?)`,
        [owner]);
    const out: string[] = [];
    for (const obj of objs) {
        if (typeof obj !== 'object' || obj.name !== 'string') {
            throw new JsonValidationError(obj);
        }
        out.push(obj.name);
    }
    return out;
}

export async function createRepo(ctx: GithubModel, owner: string, name: string): Promise<void> {
    if (await hasRepo(ctx, owner, name)) {
        throw new Error(`repo already exists: ${owner}/${name}`);
    }
    const ownerId = await getUserId(ctx, owner);
    if (!ownerId) {
        throw new Error(`no such user: ${owner}`);
    }
    await sqlite3.run(ctx.db,
        `insert into repos(userid, name) values(?, ?)`,
        [ownerId, name]);
    const repoDir = await getRepoDir(ctx, owner, name);
    await checkCall('git', ['init', '--bare', repoDir]);
}

export async function getRepoInfo(ctx: GithubModel, owner: string, name: string): Promise<RepoInfo> {
    const repoDir = path.resolve(await getRepoDir(ctx, owner, name));
    const info = await readRepoInfo(ctx.db, owner, name);
    return {
        clone_url: repoDir,
        description: info.description,
        fork: !!info.fork,
        full_name: `${owner}/${name}`,
        homepage: info.homepage,
        id: info.id,
        name,
        owner: await getPublicUserInfo(ctx, owner),
        private: !!info.private,
    };
}

type GetGitShellOptions = {
    authorName?: string;
    authorEmail?: string;
    committerName?: string;
    committerEmail?: string;
};

export async function getGitShell(ctx: GithubModel, owner: string,
        repo: string, options?: GetGitShellOptions): Promise<GitShell> {
    const opts = options || {};
    return new GitShell({
        authorEmail: opts.authorEmail || 'author@example.com',
        authorName: opts.authorName || 'A U Thor',
        clock: ctx.clock,
        committerEmail: opts.committerEmail || 'committer@example.com',
        committerName: opts.committerName || 'C O Mitter',
        dir: await getRepoDir(ctx, owner, repo),
    });
}

export async function hasBranch(ctx: GithubModel, owner: string, repo: string, name: string): Promise<boolean> {
    const shell = await getGitShell(ctx, owner, repo);
    const ret = await shell.call('git', ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`], {
        stdout: 'ignore',
    });
    return ret === 0;
}

export async function getGithubBranch(ctx: GithubModel, owner: string,
        repo: string, name: string): Promise<GithubBranch> {
    const shell = await getGitShell(ctx, owner, repo);
    const commits = await git.log(shell, ['-1', `refs/heads/${name}`, '--']);
    if (commits.length <= 0) {
        throw new Error('git log returned zero commits: should not occur');
    }
    return {
        commit: gitCommitToGithubCommit(commits[0]),
        name,
    };
}

export async function getCommit(ctx: GithubModel, owner: string, repo: string, sha: string): Promise<Commit> {
    const shell = await getGitShell(ctx, owner, repo);
    const commits = await git.log(shell, ['-1', sha, '--']);
    if (commits.length <= 0) {
        throw new Error('git log returned zero commits: should not occur');
    }
    const val = commits[0];

    const authorIdent = git.splitIdent(val.author);
    if (!authorIdent) {
        throw new Error(`TODO: don't know how to handle splitIdent() returning undefined: ${val.author}`);
    }
    const committerIdent = git.splitIdent(val.committer);
    if (!committerIdent) {
        throw new Error(`TODO: don't know how to handle splitIdent() returning undefined: ${val.committer}`);
    }
    const parents = val.parents.map(sha => { return { sha }; });
    return {
        author: {
            date: `${authorIdent.date} ${authorIdent.tz}`,
            email: authorIdent.email,
            name: authorIdent.name,
        },
        committer: {
            date: `${committerIdent.date} ${committerIdent.tz}`,
            email: committerIdent.email,
            name: committerIdent.name,
        },
        message: val.message,
        parents,
        sha: val.sha,
        tree: {
            sha: val.tree,
        },
    };
}

export async function cloneRepo(ctx: GithubModel, owner: string, repo: string): Promise<TmpGitRepo> {
    const repoDir = path.resolve(await getRepoDir(ctx, owner, repo));
    return await gitCloneRepo({
        clock: ctx.clock,
        url: repoDir,
    });
}

export async function forkRepo(ctx: GithubModel, srcOwner: string, srcRepo: string,
        dstOwner: string, dstRepo?: string): Promise<void> {
    dstRepo = dstRepo || srcRepo;
    if (await hasRepo(ctx, dstOwner, dstRepo)) {
        throw new Error(`repo already exists: ${dstOwner}/${dstRepo}`);
    }
    const dstOwnerId = await getUserId(ctx, dstOwner);
    if (!dstOwnerId) {
        throw new Error(`no such user: ${dstOwner}`);
    }
    await sqlite3.run(ctx.db,
        `insert into repos(userid, name) values(?, ?)`,
        [dstOwnerId, dstRepo]);
    const srcRepoDir = await getRepoDir(ctx, srcOwner, srcRepo);
    const dstRepoDir = await getRepoDir(ctx, dstOwner, dstRepo);
    await checkCall('git', ['clone', '--bare', srcRepoDir, dstRepoDir]);
}

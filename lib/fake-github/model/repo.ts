import * as git from '@lib/git';
import {
    cloneRepo as gitCloneRepo,
    GitShell,
    TmpGitRepo,
} from '@lib/git/testutil';
import {
    Commit,
    GithubBranch,
    RepoInfo,
} from '@lib/github';
import {
    checkCall,
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
    getPublicUserInfo,
    getUserDir,
} from './user';
import {
    gitCommitToGithubCommit,
} from './util';

export interface DiskRepoInfo {
    id: number;
    private: boolean;
    description: string | null;
    fork: boolean;
    homepage: string | null;
}

export function isDiskRepoInfo(val: any): val is DiskRepoInfo {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskRepoInfo> = val;
    return typeof obj.id === 'number' &&
        typeof obj.private === 'boolean' &&
        (typeof obj.description === 'string' || obj.description === null) &&
        typeof obj.fork === 'boolean' &&
        (typeof obj.homepage === 'string' || obj.homepage === null);
}

export function getRepoDir(dir: string, owner: string, name: string): string {
    return path.join(getUserDir(dir, owner), name);
}

export function getRepoInfoPath(dir: string, owner: string, name: string): string {
    return path.join(getRepoDir(dir, owner, name), 'info.json');
}

export function hasRepo(ctx: GithubModel, owner: string, name: string): Promise<boolean> {
    return fs.pathExists(getRepoDir(ctx.dir, owner, name));
}

export async function readRepoInfo(dir: string, owner: string, name: string): Promise<DiskRepoInfo> {
    const data = await fs.readJson(getRepoInfoPath(dir, owner, name));
    if (!isDiskRepoInfo(data)) {
        throw new JsonValidationError(data);
    }
    return data;
}

export async function writeRepoInfo(dir: string, owner: string, name: string, data: DiskRepoInfo): Promise<void> {
    await fs.mkdirs(getRepoDir(dir, owner, name));
    await fs.writeJson(getRepoInfoPath(dir, owner, name), data, { spaces: 2 });
}

export async function listRepos(ctx: GithubModel, owner: string): Promise<string[]> {
    return (await fs.readdir(getUserDir(ctx.dir, owner)))
        .filter(filename => !filename.startsWith('.'));
}

async function getMaxRepoId(ctx: GithubModel, owner: string, initial: number): Promise<number> {
    let largestId = initial;
    for (const otherRepo of (await listRepos(ctx, owner))) {
        const data = await readRepoInfo(ctx.dir, owner, otherRepo);
        largestId = Math.max(data.id, largestId);
    }
    return largestId;
}

export async function createRepo(ctx: GithubModel, owner: string, name: string): Promise<void> {
    if (await hasRepo(ctx, owner, name)) {
        throw new Error(`repo already exists: ${owner}/${name}`);
    }
    const largestId = await getMaxRepoId(ctx, owner, -1);
    const repoDir = getRepoDir(ctx.dir, owner, name);
    await checkCall('git', ['init', '--bare', repoDir]);
    await writeRepoInfo(ctx.dir, owner, name, {
        description: null,
        fork: false,
        homepage: null,
        id: largestId + 1,
        private: false,
    });
}

export async function getRepoInfo(ctx: GithubModel, owner: string, name: string): Promise<RepoInfo> {
    const repoDir = path.resolve(getRepoDir(ctx.dir, owner, name));
    const info = await readRepoInfo(ctx.dir, owner, name);
    return {
        clone_url: repoDir,
        description: info.description,
        fork: info.fork,
        full_name: `${owner}/${name}`,
        homepage: info.homepage,
        id: info.id,
        name,
        owner: await getPublicUserInfo(ctx, owner),
        private: info.private,
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
        dir: getRepoDir(ctx.dir, owner, repo),
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
    const repoDir = path.resolve(getRepoDir(ctx.dir, owner, repo));
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
    const largestId = await getMaxRepoId(ctx, dstOwner, -1);
    const srcRepoDir = getRepoDir(ctx.dir, srcOwner, srcRepo);
    const dstRepoDir = getRepoDir(ctx.dir, dstOwner, dstRepo);
    await checkCall('git', ['clone', '--bare', srcRepoDir, dstRepoDir]);
    await writeRepoInfo(ctx.dir, dstOwner, dstRepo, {
        description: null,
        fork: false,
        homepage: null,
        id: largestId + 1,
        private: false,
    });
}

/**
 * @module
 * GitHub mock module.
 */
import {
    PublicUserInfo,
    RepoInfo,
} from '@lib/github';
import {
    checkCall,
} from '@lib/shell';
import * as tmp from '@lib/tmp';
import fs from 'mz/fs';
import path from 'path';

export interface GithubModel {
    cleanup(): void;
    addUser(login: string): void;
    getUser(login: string): PublicUserInfo | undefined;
    createRepo(owner: string, name: string): Promise<void>;
}

export async function createGithubModel(): Promise<GithubModel> {
    const tmpDir = await tmp.dir({
        unsafeCleanup: true,
    });
    return new GithubModelImpl(tmpDir);
}

class GithubModelImpl implements GithubModel {
    currentTime: number; // ms since unix epoch
    tmpDir: tmp.TmpDir;
    idCtr: number;
    users: Map<string, GithubModelUser>;

    constructor(tmpDir: tmp.TmpDir) {
        this.tmpDir = tmpDir;
        this.currentTime = 0;
        this.idCtr = 0;
        this.users = new Map<string, GithubModelUser>();
    }

    cleanup(): void {
        this.tmpDir.cleanup();
    }

    tick(): void {
        this.currentTime += 1000;
    }

    async addUser(login: string): Promise<void> {
        if (this.users.has(login)) {
            throw new Error(`user already exists: ${login}`);
        }
        const id = this.idCtr++;
        await fs.mkdir(path.join(this.tmpDir.path, login));
        this.users.set(login, new GithubModelUser(id, login, this.currentTime));
    }

    getUser(login: string): PublicUserInfo | undefined {
        const modelUser = this.users.get(login);
        if (!modelUser) {
            return;
        }
        return modelUser.toPublicUserInfo();
    }

    async createRepo(owner: string, name: string): Promise<void> {
        const modelUser = this.users.get(owner);
        if (!modelUser) {
            throw new Error(`owner does not exist: ${owner}`);
        }
        if (modelUser.repos.has(name)) {
            throw new Error(`repo already exists: ${owner}/${name}`);
        }
        const repoPath = path.join(this.tmpDir.path, owner, name);
        await fs.mkdir(path.join(this.tmpDir.path, owner, name));
        await checkCall('git', ['init', '--bare', repoPath]);
        const modelRepo = new GithubModelRepo(this.idCtr++, modelUser, name, this.currentTime, repoPath);
        modelUser.repos.set(name, modelRepo);
    }

    getRepoInfo(owner: string, name: string): RepoInfo | undefined {
        const modelUser = this.users.get(owner);
        if (!modelUser) {
            return;
        }
        const modelRepo = modelUser.repos.get(name);
        if (!modelRepo) {
            return;
        }
        return modelRepo.toRepoInfo();
    }
}

class GithubModelUser {
    id: number;
    login: string;
    createdAt: number;
    updatedAt: number;
    repos: Map<string, GithubModelRepo>;

    constructor(id: number, login: string, createdAt: number) {
        this.id = id;
        this.login = login;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
        this.repos = new Map<string, GithubModelRepo>();
    }

    toPublicUserInfo(): PublicUserInfo {
        return {
            avatar_url: `https://avatars2.githubusercontent.com/u/${this.id}?v=3`,
            bio: null,
            blog: '',
            company: null,
            created_at: getTimestamp(this.createdAt),
            email: null,
            followers: 0,
            following: 0,
            hireable: null,
            id: this.id,
            location: null,
            login: this.login,
            name: `${this.login} name`,
            public_gists: 0,
            public_repos: 0,
            site_admin: false,
            type: 'User',
            updated_at: getTimestamp(this.updatedAt),
        };
    }
}

class GithubModelRepo {
    id: number;
    owner: GithubModelUser;
    name: string;
    createdAt: number;
    updatedAt: number;
    path: string;

    constructor(id: number, owner: GithubModelUser, name: string, createdAt: number, path: string) {
        this.id = id;
        this.owner = owner;
        this.name = name;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
        this.path = path;
    }

    toRepoInfo(): RepoInfo {
        return {
            clone_url: `file://${this.path}`,
            created_at: getTimestamp(this.createdAt),
            default_branch: 'master',
            description: null,
            fork: false,
            forks_count: 0,
            full_name: `${this.owner.login}/${this.name}`,
            git_url: `file://${this.path}`,
            has_downloads: false,
            has_issues: false,
            has_pages: false,
            has_projects: false,
            has_wiki: false,
            homepage: null,
            html_url: `https://github.com/${this.owner.login}/${this.name}`,
            id: this.id,
            language: null,
            mirror_url: null,
            name: this.name,
            open_issues_count: 0,
            owner: this.owner.toPublicUserInfo(),
            private: false,
            size: 0,
            ssh_url: `file://${this.path}`,
            stargazers_count: 0,
            updated_at: getTimestamp(this.updatedAt),
            watchers_count: 0,
        };
    }
}

function getTimestamp(time: number): string {
    const d = new Date(time);
    const dateString = `${d.getUTCFullYear()}-${lp(d.getUTCMonth() + 1, 2)}-${lp(d.getUTCDay() + 1, 2)}`;
    const timeString = `${lp(d.getUTCHours(), 2)}:${lp(d.getUTCMinutes(), 2)}:${lp(d.getUTCSeconds(), 2)}`;
    return `${dateString}T${timeString}Z`;
}

function lp(num: number, targetLength: number): string {
    const s = String(num);
    if (s.length > targetLength) {
        return s;
    } else {
        const padLength = targetLength - s.length;
        const padString = '0'.repeat(padLength);
        return padString + s;
    }
}

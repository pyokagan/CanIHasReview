import {
    MiniPublicUserInfo,
    PublicUserInfo,
} from '@lib/github';
import fs from 'fs-extra';
import path from 'path';
import {
    GithubModel,
} from './ctx';
import {
    JsonValidationError,
} from './errors';

export interface DiskUser {
    id: number;
    type: 'User' | 'Organization';
    name: string;
    company: string | null;
    blog: string;
    location: string | null;
    email: string | null;
    hireable: boolean | null;
    bio: string | null;
}

export function isDiskUser(val: any): val is DiskUser {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskUser> = val;
    return typeof obj.id === 'number' &&
        (obj.type === 'User' || obj.type === 'Organization') &&
        typeof obj.name === 'string' &&
        (typeof obj.company === 'string' || obj.company === null) &&
        typeof obj.blog === 'string' &&
        (typeof obj.location === 'string' || obj.location === null) &&
        (typeof obj.email === 'string' || obj.email === null) &&
        (typeof obj.hireable === 'boolean' || obj.hireable === null) &&
        (typeof obj.bio === 'string' || obj.bio === null);
}

export function getUserDir(dir: string, login: string): string {
    return path.join(dir, login);
}

export function getUserDataPath(dir: string, login: string): string {
    return path.join(getUserDir(dir, login), '.data.json');
}

export function hasUser(ctx: GithubModel, login: string): Promise<boolean> {
    return fs.pathExists(getUserDir(ctx.dir, login));
}

export async function readUser(dir: string, login: string): Promise<DiskUser> {
    const data = await fs.readJson(getUserDataPath(dir, login));
    if (!isDiskUser(data)) {
        throw new JsonValidationError(data);
    }
    return data;
}

export async function writeUser(dir: string, login: string, data: DiskUser): Promise<void> {
    await fs.mkdirs(getUserDir(dir, login));
    await fs.writeJson(getUserDataPath(dir, login), data, { spaces: 2 });
}

export async function listUsers(ctx: GithubModel): Promise<string[]> {
    return (await fs.readdir(ctx.dir))
        .filter(filename => !filename.startsWith('.'));
}

async function getLargestId(ctx: GithubModel, initial: number): Promise<number> {
    let largestId = initial;
    for (const otherLogin of (await listUsers(ctx))) {
        const data = await readUser(ctx.dir, otherLogin);
        largestId = Math.max(data.id, largestId);
    }
    return largestId;
}

export async function createUser(ctx: GithubModel, login: string): Promise<void> {
    if (await hasUser(ctx, login)) {
        throw new Error(`user already exists: ${login}`);
    }
    const largestId = await getLargestId(ctx, -1);
    await writeUser(ctx.dir, login, {
        bio: null,
        blog: '',
        company: null,
        email: null,
        hireable: null,
        id: largestId + 1,
        location: null,
        name: `${login} name`,
        type: 'User',
    });
}

export async function createOrganization(ctx: GithubModel, login: string): Promise<void> {
    if (await hasUser(ctx, login)) {
        throw new Error(`user already exists: ${login}`);
    }
    const largestId = await getLargestId(ctx, -1);
    await writeUser(ctx.dir, login, {
        bio: null,
        blog: '',
        company: null,
        email: null,
        hireable: null,
        id: largestId + 1,
        location: null,
        name: `${login} name`,
        type: 'Organization',
    });
}

export async function getPublicUserInfo(ctx: GithubModel, login: string): Promise<PublicUserInfo> {
    const data = await readUser(ctx.dir, login);
    return {
        avatar_url: `https://avatars2.githubusercontent.com/u/${data.id}?v=3`,
        bio: data.bio,
        blog: data.blog,
        company: data.company,
        email: data.email,
        hireable: data.hireable,
        id: data.id,
        location: null,
        login,
        name: data.name,
        type: data.type,
    };
}

export async function getMiniPublicUserInfo(ctx: GithubModel, login: string): Promise<MiniPublicUserInfo> {
    const data = await readUser(ctx.dir, login);
    return {
        avatar_url: `https://avatars2.githubusercontent.com/u/${data.id}?v=3`,
        id: data.id,
        login,
        type: data.type,
    };
}

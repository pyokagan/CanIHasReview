import {
    MiniPublicUserInfo,
    PublicUserInfo,
} from '@lib/github';
import * as sqlite3 from '@lib/sqlite3-promise';
import {
    GithubModel,
} from './ctx';
import {
    JsonValidationError,
} from './errors';

export interface DiskUser {
    id: number;
    login: string;
    type: 'User' | 'Organization';
    name: string;
    company: string | null;
    blog: string;
    location: string | null;
    email: string | null;
    hireable: number | null;
    bio: string | null;
}

export function isDiskUser(val: any): val is DiskUser {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskUser> = val;
    return typeof obj.id === 'number' &&
        typeof obj.login === 'string' &&
        (obj.type === 'User' || obj.type === 'Organization') &&
        typeof obj.name === 'string' &&
        (typeof obj.company === 'string' || obj.company === null) &&
        typeof obj.blog === 'string' &&
        (typeof obj.location === 'string' || obj.location === null) &&
        (typeof obj.email === 'string' || obj.email === null) &&
        (typeof obj.hireable === 'number' || obj.hireable === null) &&
        (typeof obj.bio === 'string' || obj.bio === null);
}

export async function getUserId(ctx: GithubModel, login: string): Promise<number | undefined> {
    const obj = await sqlite3.get(ctx.db, 'select id from users where login=?', [login]);
    if (!obj) {
        return obj;
    }
    if (typeof obj.id !== 'number') {
        throw new JsonValidationError(obj);
    }
    return obj.id;
}

export async function getUserLogin(ctx: GithubModel, userId: number): Promise<string> {
    const obj = await sqlite3.get(ctx.db, 'select login from users where id=?', [userId]);
    if (!obj) {
        throw new Error(`no such uid: ${userId}`);
    }
    if (typeof obj.login !== 'string') {
        throw new JsonValidationError(obj);
    }
    return obj.login;
}

export async function hasUser(ctx: GithubModel, login: string): Promise<boolean> {
    return typeof (await getUserId(ctx, login)) === 'number';
}

export async function readUser(db: sqlite3.Database, login: string): Promise<DiskUser> {
    const result = await sqlite3.get(db, 'select * from users where login = ?', [login]);
    if (!result) {
        throw new Error(`no such user: ${login}`);
    }
    if (!isDiskUser(result)) {
        throw new JsonValidationError(result);
    }
    return result;
}

export async function writeUser(db: sqlite3.Database, data: DiskUser): Promise<void> {
    await sqlite3.run(db, `update users set login=?, type=?, name=?, company=?, blog=?,
            location=?, email=?, hireable=?, bio=? where id=?`,
        [
            data.login,
            data.type,
            data.name,
            data.company,
            data.blog,
            data.location,
            data.email,
            data.hireable ? 1 : 0,
            data.bio,
            data.id,
        ]);
}

export async function listUsers(ctx: GithubModel): Promise<string[]> {
    const objs = await sqlite3.all(ctx.db, 'select login from users', []);
    const out: string[] = [];
    for (const obj of objs) {
        if (typeof obj.login !== 'string') {
            throw new JsonValidationError(obj);
        }
        out.push(obj.login);
    }
    return out;
}

export async function createUser(ctx: GithubModel, login: string): Promise<void> {
    if (await hasUser(ctx, login)) {
        throw new Error(`user already exists: ${login}`);
    }
    await sqlite3.run(ctx.db, `insert into users(login, type, name) values(?, ?, ?)`, [login, 'User', `${login} name`]);
}

export async function createOrganization(ctx: GithubModel, login: string): Promise<void> {
    if (await hasUser(ctx, login)) {
        throw new Error(`user already exists: ${login}`);
    }
    await sqlite3.run(ctx.db, `insert into users(login, type, name) values(?, ?, ?)`,
            [login, 'Organization', `${login} name`]);
}

export async function getPublicUserInfo(ctx: GithubModel, login: string): Promise<PublicUserInfo> {
    const data = await readUser(ctx.db, login);
    return {
        avatar_url: `https://avatars2.githubusercontent.com/u/${data.id}?v=3`,
        bio: data.bio,
        blog: data.blog,
        company: data.company,
        email: data.email,
        hireable: !!data.hireable,
        id: data.id,
        location: null,
        login,
        name: data.name,
        type: data.type,
    };
}

export async function getMiniPublicUserInfo(ctx: GithubModel, login: string): Promise<MiniPublicUserInfo> {
    const data = await readUser(ctx.db, login);
    return {
        avatar_url: `https://avatars2.githubusercontent.com/u/${data.id}?v=3`,
        id: data.id,
        login,
        type: data.type,
    };
}

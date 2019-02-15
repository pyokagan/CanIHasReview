import * as sqlite3 from '@lib/sqlite3-promise';
import { GithubModel } from './ctx';
import { JsonValidationError } from './errors';
import { getUserId, getUserLogin } from './user';

export interface OauthToken {
    clientId: string;
    login: string;
}

export interface DiskOauthToken {
    id: string;
    clientid: string;
    userid: number;
}

export function isDiskOauthToken(val: any): val is DiskOauthToken {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskOauthToken> = val;
    return typeof obj.id === 'string' &&
        typeof obj.clientid === 'string' &&
        typeof obj.userid === 'number';
}

export async function hasOauthToken(ctx: GithubModel, token: string): Promise<boolean> {
    const obj = await sqlite3.get(ctx.db, `select id from oauthtokens where id = ?`, [token]);
    return !!obj;
}

export async function readOauthToken(ctx: GithubModel, token: string): Promise<DiskOauthToken> {
    const obj = await sqlite3.get(ctx.db, `select * from oauthtokens where id = ?`, [token]);
    if (!obj) {
        throw new Error(`no such oauth token: ${token}`);
    }
    if (!isDiskOauthToken(obj)) {
        throw new JsonValidationError(obj);
    }
    return obj;
}

export async function writeOauthToken(ctx: GithubModel, data: DiskOauthToken): Promise<void> {
    await sqlite3.run(ctx.db, `update oauthtokens set clientid = ?, userid = ? where id = ?`, [
        data.clientid,
        data.userid,
        data.id,
    ]);
}

export async function listOauthTokens(ctx: GithubModel): Promise<string[]> {
    const objs = await sqlite3.all(ctx.db, `select id from oauthtokens`, []);
    const out: string[] = [];
    for (const obj of objs) {
        if (typeof obj.id !== 'string') {
            throw new JsonValidationError(obj);
        }
        out.push(obj.id);
    }
    return out;
}

export async function createOauthToken(ctx: GithubModel, token: string,
        clientId: string, login: string): Promise<void> {
    const userId = await getUserId(ctx, login);
    if (!userId) {
        throw new Error(`no such user: ${login}`);
    }
    await sqlite3.run(ctx.db, `insert into oauthtokens(id, clientid, userid) values(?, ?, ?)`,
        [token, clientId, userId]);
}

export async function getOauthToken(ctx: GithubModel, token: string): Promise<OauthToken> {
    const data = await readOauthToken(ctx, token);
    return {
        clientId: data.clientid,
        login: await getUserLogin(ctx, data.userid),
    };
}

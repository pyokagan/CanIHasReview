import * as sqlite3 from '@lib/sqlite3-promise';
import { GithubModel } from './ctx';
import { JsonValidationError } from './errors';

export interface OauthClient {
    id: string;
    secret: string;
}

export interface DiskOauthClient {
    id: string;
    secret: string;
}

export function isDiskOauthClient(val: any): val is DiskOauthClient {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskOauthClient> = val;
    return typeof obj.id === 'string' &&
        typeof obj.secret === 'string';
}

export async function hasOauthClient(ctx: GithubModel, clientId: string): Promise<boolean> {
    const obj = await sqlite3.get(ctx.db, `select id from oauthclients where id = ?`, [clientId]);
    return !!obj;
}

export async function readOauthClient(ctx: GithubModel, clientId: string): Promise<DiskOauthClient> {
    const obj = await sqlite3.get(ctx.db, `select * from oauthclients where id = ?`, [clientId]);
    if (!obj) {
        throw new Error(`no such oauth client with id: ${clientId}`);
    }
    if (!isDiskOauthClient(obj)) {
        throw new JsonValidationError(obj);
    }
    return obj;
}

export async function writeOauthClient(ctx: GithubModel, data: DiskOauthClient): Promise<void> {
    await sqlite3.run(ctx.db, `update oauthclients set secret = ? where id = ?`, [
        data.secret,
        data.id,
    ]);
}

export async function listOauthClients(ctx: GithubModel): Promise<string[]> {
    const objs = await sqlite3.all(ctx.db, `select id from oauthclients`, []);
    const out: string[] = [];
    for (const obj of objs) {
        if (typeof obj.id !== 'string') {
            throw new JsonValidationError(obj);
        }
        out.push(obj.id);
    }
    return out;
}

export async function createOauthClient(ctx: GithubModel, clientId: string, clientSecret: string): Promise<void> {
    await sqlite3.run(ctx.db, `insert into oauthclients(id, secret) values(?, ?)`, [clientId, clientSecret]);
}

export async function getOauthClient(ctx: GithubModel, clientId: string): Promise<OauthClient> {
    const obj = await readOauthClient(ctx, clientId);
    return {
        id: obj.id,
        secret: obj.secret,
    };
}

import { Installation } from '@lib/github';
import * as sqlite3 from '@lib/sqlite3-promise';
import { GithubModel } from './ctx';
import { JsonValidationError } from './errors';
import { createOauthClient } from './oauthclients';
import { getRepoId } from './repo';
import { createBot } from './user';

export interface DiskApp {
    id: number;
    name: string;
    userid: number; // user id this app is linked to
    oauthclientid: string;
    publickey: string;
}

export function isDiskApp(val: any): val is DiskApp {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskApp> = val;
    return typeof obj.id === 'number' &&
        typeof obj.name === 'string' &&
        typeof obj.userid === 'number' &&
        typeof obj.oauthclientid === 'string' &&
        typeof obj.publickey === 'string';
}

export async function readApp(ctx: GithubModel, appId: number): Promise<DiskApp> {
    const obj = await sqlite3.get(ctx.db, `select * from apps where id = ?`, [appId]);
    if (!obj) {
        throw new Error(`no such app with id: ${appId}`);
    }
    if (!isDiskApp(obj)) {
        throw new JsonValidationError(obj);
    }
    return obj;
}

export async function hasApp(ctx: GithubModel, appId: number): Promise<boolean> {
    const obj = await readApp(ctx, appId);
    return !!obj;
}

export async function createApp(ctx: GithubModel, name: string, publickey: string): Promise<number> {
    const userId = await createBot(ctx, `${name}[bot]`);
    const oauthClientId = `${name}.oauthclientid`;
    const oauthClientSecret = `${name}.oauthclientsecret`;
    await createOauthClient(ctx, oauthClientId, oauthClientSecret);
    const appId = await sqlite3.runWithRowId(ctx.db,
        `insert into apps(name, userid, oauthclientid, publickey) values(?, ?, ?, ?)`,
        [name, userId, oauthClientId, publickey]);
    return appId;
}

export interface DiskInstallation {
    id: number;
    repoid: number;
    appid: number;
}

export function isDiskInstallation(val: any): val is DiskInstallation {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskInstallation> = val;
    return typeof obj.id === 'number' &&
        typeof obj.repoid  === 'number' &&
        typeof obj.appid === 'number';
}

export async function createInstallation(ctx: GithubModel, appId: number,
        repoOwner: string, repoName: string): Promise<number> {
    const repoId = await getRepoId(ctx, repoOwner, repoName);
    if (typeof repoId !== 'number') {
        throw new Error(`no such repo: ${repoOwner}/${repoName}`);
    }
    const installationId = await sqlite3.runWithRowId(ctx.db,
        `insert into installations(repoid, appid) values(?, ?)`,
        [repoId, appId]);
    return installationId;
}

export async function getRepoInstallation(ctx: GithubModel, appId: number,
        repoOwner: string, repoName: string): Promise<Installation | undefined> {
    const repoId = await getRepoId(ctx, repoOwner, repoName);
    if (typeof repoId !== 'number') {
        throw new Error(`no such repo: ${repoOwner}/${repoName}`);
    }
    const obj = await sqlite3.get(ctx.db,
        `select * from installations where repoid = ? and appid = ?`,
        [repoId, appId]);
    if (!obj) {
        return;
    }
    if (!isDiskInstallation(obj)) {
        throw new JsonValidationError(obj);
    }
    return {
        id: obj.id,
    };
}

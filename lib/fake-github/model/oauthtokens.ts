import fs from 'fs-extra';
import path from 'path';
import {
    GithubModel,
} from './ctx';
import {
    JsonValidationError,
} from './errors';
import {
    hasOauthClient,
} from './oauthclients';
import {
    hasUser,
} from './user';

export interface OauthToken {
    clientId: string;
    login: string;
}

export interface DiskOauthToken {
    clientId: string;
    login: string;
}

export function isDiskOauthToken(val: any): val is DiskOauthToken {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskOauthToken> = val;
    return typeof obj.clientId === 'string' &&
        typeof obj.login === 'string';
}

export function getOauthTokensDir(dir: string): string {
    return path.join(dir, '.oauthtokens');
}

export function getOauthTokenPath(dir: string, token: string): string {
    return path.join(getOauthTokensDir(dir), `${token}.json`);
}

export function hasOauthToken(ctx: GithubModel, token: string): Promise<boolean> {
    return fs.pathExists(getOauthTokenPath(ctx.dir, token));
}

export async function readOauthToken(dir: string, token: string): Promise<DiskOauthToken> {
    const data = await fs.readJson(getOauthTokenPath(dir, token));
    if (!isDiskOauthToken(data)) {
        throw new JsonValidationError(data);
    }
    return data;
}

export async function writeOauthToken(dir: string, token: string, data: DiskOauthToken): Promise<void> {
    await fs.mkdirs(getOauthTokensDir(dir));
    await fs.writeJson(getOauthTokenPath(dir, token), data, { spaces: 2 });
}

export async function listOauthTokens(dir: string): Promise<string[]> {
    const oauthTokensDir = getOauthTokensDir(dir);
    if (!(await fs.pathExists(oauthTokensDir))) {
        return [];
    }
    return (await fs.readdir(oauthTokensDir))
        .filter(filename => filename.endsWith('.json'))
        .map(filename => filename.substring(0, filename.length - '.json'.length));
}

export async function createOauthToken(ctx: GithubModel, token: string,
        clientId: string, login: string): Promise<void> {
    if (!(await hasOauthClient(ctx, clientId))) {
        throw new Error(`no such oauth client: ${clientId}`);
    }

    if (!(await hasUser(ctx, login))) {
        throw new Error(`no such user: ${login}`);
    }

    if (await hasOauthToken(ctx, token)) {
        throw new Error(`oauth token already exists: ${token}`);
    }

    await writeOauthToken(ctx.dir, token, {
        clientId,
        login,
    });
}

export async function getOauthToken(ctx: GithubModel, token: string): Promise<OauthToken> {
    const data = await readOauthToken(ctx.dir, token);
    return {
        clientId: data.clientId,
        login: data.login,
    };
}

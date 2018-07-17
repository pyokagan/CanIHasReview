import fs from 'fs-extra';
import path from 'path';
import {
    GithubModel,
} from './ctx';
import {
    JsonValidationError,
} from './errors';

export interface OauthClient {
    id: string;
    secret: string;
}

export interface DiskOauthClient {
    secret: string;
}

export function isDiskOauthClient(val: any): val is DiskOauthClient {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskOauthClient> = val;
    return typeof obj.secret === 'string';
}

export function getOauthClientsDir(dir: string): string {
    return path.join(dir, '.oauthclients');
}

export function getOauthClientPath(dir: string, clientId: string): string {
    return path.join(getOauthClientsDir(dir), `${clientId}.json`);
}

export function hasOauthClient(ctx: GithubModel, clientId: string): Promise<boolean> {
    return fs.pathExists(getOauthClientPath(ctx.dir, clientId));
}

export async function readOauthClient(dir: string, clientId: string): Promise<DiskOauthClient> {
    const data = await fs.readJson(getOauthClientPath(dir, clientId));
    if (!isDiskOauthClient(data)) {
        throw new JsonValidationError(data);
    }
    return data;
}

export async function writeOauthClient(dir: string, clientId: string, data: DiskOauthClient): Promise<void> {
    await fs.mkdirs(getOauthClientsDir(dir));
    await fs.writeJson(getOauthClientPath(dir, clientId), data, { spaces: 2 });
}

export async function listOauthClients(dir: string): Promise<string[]> {
    const oauthClientsDir = getOauthClientsDir(dir);
    if (!(await fs.pathExists(oauthClientsDir))) {
        return [];
    }
    return (await fs.readdir(oauthClientsDir))
        .filter(filename => filename.endsWith('.json'))
        .map(filename => filename.substring(0, filename.length - '.json'.length));
}

export async function createOauthClient(ctx: GithubModel, clientId: string, clientSecret: string): Promise<void> {
    if (await hasOauthClient(ctx, clientId)) {
        throw new Error(`oauth client id already exists: ${clientId}`);
    }

    await writeOauthClient(ctx.dir, clientId, {
        secret: clientSecret,
    });
}

export async function getOauthClient(ctx: GithubModel, clientId: string): Promise<OauthClient> {
    const data = await readOauthClient(ctx.dir, clientId);
    return {
        id: clientId,
        secret: data.secret,
    };
}

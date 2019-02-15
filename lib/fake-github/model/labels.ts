import { Label } from '@lib/github';
import * as sqlite3 from '@lib/sqlite3-promise';
import { GithubModel } from './ctx';
import { JsonValidationError } from './errors';
import { getRepoId } from './repo';

interface DiskLabel {
    id: number;
    name: string;
}

function isDiskLabel(val: any): val is DiskLabel {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    const obj: Partial<DiskLabel> = val;
    return typeof obj.id === 'number' &&
        typeof obj.name === 'string';
}

export async function getLabelId(ctx: GithubModel, owner: string,
        repo: string, name: string): Promise<number | undefined> {
    const obj = await sqlite3.get(ctx.db, `select id from labels where name = ?
        and repoid = (select id from repos where name = ?
            and userid = (select id from users where login = ?))`,
        [name, repo, owner]);
    if (!obj) {
        return obj;
    }
    if (typeof obj.id !== 'number') {
        throw new JsonValidationError(obj);
    }
    return obj.id;
}

export async function hasLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<boolean> {
    return typeof (await getLabelId(ctx, owner, repo, name)) === 'number';
}

async function readLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<DiskLabel> {
    const obj = await sqlite3.get(ctx.db, `select * from labels
        where name = ?
        and repoid = (select id from repos where name = ?
            and userid = (select id from users where login = ?))`,
        [name, repo, owner]);
    if (!obj) {
        throw new Error(`no such label: ${owner}/${repo}/${name}`);
    }
    if (!isDiskLabel(obj)) {
        throw new JsonValidationError(obj);
    }
    return obj;
}

export async function listLabels(ctx: GithubModel, owner: string, repo: string): Promise<string[]> {
    const objs = await sqlite3.all(ctx.db, `select name from labels
        where repoid = (select id from repos where name = ?
            and userid = (select id from users where login = ?))`,
        [repo, owner]);
    const out: string[] = [];
    for (const obj of objs) {
        if (typeof obj !== 'string') {
            throw new JsonValidationError(obj);
        }
        out.push(obj);
    }
    return out;
}

export async function createLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<void> {
    const repoId = await getRepoId(ctx, owner, repo);
    if (!repoId) {
        throw new Error(`no such repo: ${owner}/${repo}`);
    }
    await sqlite3.run(ctx.db, `insert into labels(repoid, name) values(?, ?)`, [repoId, name]);
}

export async function getLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<Label> {
    const obj = await readLabel(ctx, owner, repo, name);
    return {
        id: obj.id,
        name: obj.name,
    };
}

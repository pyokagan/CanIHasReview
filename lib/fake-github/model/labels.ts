import {
    Label,
} from '@lib/github';
import fs from 'fs-extra';
import path from 'path';
import {
    GithubModel,
} from './ctx';
import {
    JsonValidationError,
} from './errors';
import {
    getRepoDir, hasRepo,
} from './repo';

interface DiskLabel {
}

function isDiskLabel(val: any): val is DiskLabel {
    if (typeof val !== 'object' || val === null) {
        return false;
    }

    return true;
}

export function getLabelsDir(dir: string, owner: string, repo: string): string {
    return path.join(getRepoDir(dir, owner, repo), 'labels');
}

export function getLabelPath(dir: string, owner: string, repo: string, name: string): string {
    return path.join(getLabelsDir(dir, owner, repo), `${name}.json`);
}

export function hasLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<boolean> {
    return fs.pathExists(getLabelPath(ctx.dir, owner, repo, name));
}

async function readLabel(dir: string, owner: string, repo: string, name: string): Promise<DiskLabel> {
    const data = await fs.readJson(getLabelPath(dir, owner, repo, name));
    if (!isDiskLabel(data)) {
        throw new JsonValidationError(data);
    }
    return data;
}

async function writeLabel(dir: string, owner: string, repo: string, name: string, data: DiskLabel): Promise<void> {
    await fs.mkdirs(getLabelsDir(dir, owner, repo));
    await fs.writeJson(getLabelPath(dir, owner, repo, name), data, { spaces: 2 });
}

export async function listLabels(ctx: GithubModel, owner: string, repo: string): Promise<string[]> {
    const labelsDir = getLabelsDir(ctx.dir, owner, repo);
    if (!(await fs.pathExists(labelsDir))) {
        return [];
    }
    return (await fs.readdir(labelsDir))
        .filter(filename => filename.endsWith('.json'))
        .map(filename => filename.substring(0, filename.length - '.json'.length));
}

export async function createLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<void> {
    if (!(await hasRepo(ctx, owner, repo))) {
        throw new Error(`no such repo: ${owner}/${repo}`);
    }

    await fs.mkdirs(getLabelsDir(ctx.dir, owner, repo));
    await writeLabel(ctx.dir, owner, repo, name, {
        color: 'ffffff',
    });
}

export async function getLabel(ctx: GithubModel, owner: string, repo: string, name: string): Promise<Label> {
    await readLabel(ctx.dir, owner, repo, name);
    return {
        id: 0,
        name,
    };
}

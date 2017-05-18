import assert from 'assert';
import isObjectLike from 'lodash/isObjectLike';
import * as git from '../git';
import Shell from '../shell';
import {
    forceCherryPick,
    forcePick,
} from './util';

export {
    Commit,
} from '../git';

/**
 * Initializes a work repo.
 * The `cwd` of `shell` must be inside the directory where you want the work repo to be (usually a temp dir).
 */
export async function initWorkRepo(shell: Shell, originUrl: string): Promise<void> {
    await shell.checkCall('git', ['init']);
    await shell.checkCall('git', ['config', 'user.name', 'CanI HasReview']);
    await shell.checkCall('git', ['config', 'user.email', 'pyokagan+canihasreview@gmail.com']);
    await shell.checkCall('git', ['remote', 'add', 'origin', originUrl]);
    await shell.checkCall('git', [
        'fetch', '-q', 'origin',
        '+refs/heads/*:refs/remotes/origin/*',
        '+refs/pr/*:refs/pr/*',
    ]);
}

/**
 * Represents a PR version.
 */
export interface Version {
    /**
     * Base SHA.
     */
    base: string;

    /**
     * Head SHA.
     */
    head: string;

    /**
     * Interdiff SHA (if any).
     */
    interdiff?: string;
}

/**
 * Returns true if `value` implements {@link Version}, false otherwise.
 */
export function isVersion(value: any): value is Version {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<Version> = value;
    return typeof obj.base === 'string' &&
        typeof obj.head === 'string' &&
        (typeof obj.interdiff === 'string' || typeof obj.interdiff === 'undefined');
}

/**
 * Returns stored PR versions.
 */
export async function getVersions(shell: Shell, prNumber: number): Promise<(Version | undefined)[]> {
    // refs/pr/NUMBER/VERSION/{head,base,interdiff}
    const refNames = (await shell.checkOutput('git', [
        'for-each-ref',
        '--format', '%(refname)/%(objectname)',
        `refs/pr/${prNumber}/*/*`,
    ])).trim();

    if (!refNames.length) {
        return [];
    }

    const partialVersions: (Partial<Version> | undefined)[] = [];
    for (const refName of refNames.split('\n')) {
        const components = refName.split('/');
        assert(components[0] === 'refs');
        assert(components[1] === 'pr');
        assert(components[2] === String(prNumber));
        const versionNumber = parseInt(components[3], 10);
        const partialVersion = partialVersions[versionNumber] || {};
        partialVersions[versionNumber] = partialVersion;

        switch (components[4]) {
        case 'head':
            partialVersion.head = components[5];
            break;
        case 'base':
            partialVersion.base = components[5];
            break;
        case 'interdiff':
            partialVersion.interdiff = components[5];
            break;
        default:
            // ignore
        }
    }

    return partialVersions.map(x => isVersion(x) ? x : undefined);
}

/**
 * Returns version info.
 */
export async function getVersion(shell: Shell, prNumber: number, versionNumber: number): Promise<Version | undefined> {
    const refNames = (await shell.checkOutput('git', [
        'for-each-ref',
        '--format', '%(refname)/%(objectname)',
        `refs/pr/${prNumber}/${versionNumber}/*`,
    ])).trim();

    if (!refNames.length) {
        return;
    }

    const partialVersion: Partial<Version> = {};
    for (const refName of refNames.split('\n')) {
        const components = refName.split('/');

        switch (components[4]) {
        case 'head':
            partialVersion.head = components[5];
            break;
        case 'base':
            partialVersion.base = components[5];
            break;
        case 'interdiff':
            partialVersion.interdiff = components[5];
            break;
        default:
            // ignore
        }
    }

    return isVersion(partialVersion) ? partialVersion : undefined;
}

/**
 * Returns list of commits for a version.
 */
export async function getVersionCommits(shell: Shell, prNumber: number, versionNumber: number): Promise<git.Commit[]> {
    return await git.log(shell, [
        '--reverse',
        `pr/${prNumber}/${versionNumber}/base..pr/${prNumber}/${versionNumber}/head`,
    ]);
}

async function setVersionSha(shell: Shell, prNumber: number,
        versionNumber: number, key: keyof Version, sha: string): Promise<void> {
    return shell.checkCall('git', [
        'update-ref',
        `refs/pr/${prNumber}/${versionNumber}/${key}`,
        sha,
    ]);
}

export async function setVersionBase(shell: Shell, prNumber: number,
        versionNumber: number, sha: string): Promise<void> {
    return setVersionSha(shell, prNumber, versionNumber, 'base', sha);
}

export async function setVersionHead(shell: Shell, prNumber: number,
        versionNumber: number, sha: string): Promise<void> {
    return setVersionSha(shell, prNumber, versionNumber, 'head', sha);
}

export async function setVersionInterdiff(shell: Shell, prNumber: number,
        versionNumber: number, sha: string): Promise<void> {
    return setVersionSha(shell, prNumber, versionNumber, 'interdiff', sha);
}

/**
 * Fetch PR from GitHub.
 * Returns the SHA of the PR head.
 */
export async function fetchPr(workShell: Shell, prNumber: number): Promise<string> {
    await workShell.checkCall('git', ['fetch', '-q', 'origin', `pull/${prNumber}/head`]);
    return (await workShell.checkOutput('git', ['rev-parse', 'FETCH_HEAD']));
}

/**
 * "Makes" a version.
 */
export async function makeVersion(workShell: Shell, prNumber: number,
        versionNumber: number, base: string, head: string): Promise<Version> {
    const out: Version = {
        base,
        head,
    };

    await setVersionBase(workShell, prNumber, versionNumber, base);
    await setVersionHead(workShell, prNumber, versionNumber, head);

    // Generate interdiff
    const prevVersion = await getVersion(workShell, prNumber, versionNumber - 1);
    if (prevVersion) {
        await workShell.checkCall('git', ['checkout', base]);
        await forceCherryPick(workShell, `${prevVersion.base}..${prevVersion.head}`);
        await forcePick(workShell, head);
        await workShell.checkCall('git', ['commit', '--amend', '--allow-empty',
            '-m', `Interdiff between v${versionNumber - 1} and v${versionNumber}`]);
        out.interdiff = (await workShell.checkOutput('git', ['rev-parse', 'HEAD'])).trim();
        await setVersionInterdiff(workShell, prNumber, versionNumber, out.interdiff);
    }

    return out;
}

/**
 * Push version(s).
 */
export async function pushVersions(shell: Shell, prNumber: number, versionNumbers: number[]): Promise<void> {
    const pathspecs = versionNumbers.map(x => `+refs/pr/${prNumber}/${x}/*:refs/pr/${prNumber}/${x}/*`);
    const cmd = ['push', '-f', 'origin'];
    cmd.push.apply(cmd, pathspecs);

    await shell.checkCall('git', cmd);
}

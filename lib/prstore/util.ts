import * as git from '@lib/git';
import Shell from '@lib/shell';

export async function forcePick(workShell: Shell, sha: string): Promise<void> {
    await workShell.checkCall('git', ['read-tree', '--reset', '-u', sha]);
    await workShell.checkCall('git', ['commit', '--allow-empty', '-C', sha]);
}

export async function forceCherryPick(workShell: Shell, sha: string): Promise<void> {
    let cmd: string[] = ['cherry-pick', '-X', 'theirs', sha];
    let statuses: git.Status[];

    while (true) {
        try {
            await workShell.checkCall('git', cmd);
            return;
        } catch (e) {
            statuses = await git.status(workShell);
            if (!statuses) {
                throw e; // No conflicts, likely some other error
            }
        }

        // Resolve conflicts
        // NOTE: us = the base branch, them = the previous PR version being cherry-picked
        for (const conflict of statuses) {
            switch (conflict.xy) {
            case 'M ':
            case 'A ':
            case 'R ':
            case 'D ':
            case 'C ': // index and work tree matches
                break; // do nothing
            case 'UD': // updated by us, deleted by them
                await workShell.checkCall('git', ['rm', conflict.path]);
                break;
            case 'DU': // deleted by us, updated by them
                // resolution: remove the file as it is likely the new version will accept
                // the change on the base branch.
                // If the new version does not accept the change on the base branch, the interdiff for that
                // file would be useless, but not accepting the base branch is a pretty big change by itself anyway.
                await workShell.checkCall('git', ['rm', conflict.path]);
                break;
            case 'UA': // updated by us, added as a new file by them
                // resolution: use the new file added by them
                await workShell.checkCall('git', ['add', conflict.path]);
                break;
            default:
                throw new Error('Unknown conflict status ' + conflict.xy);
            }
        }

        await workShell.checkCall('git', ['commit', '--no-edit', '--allow-empty']);

        cmd = ['cherry-pick', '--continue'];
    }
}

/**
 * Returns true if the remote exists.
 */
export async function hasRemote(shell: Shell, remote: string): Promise<boolean> {
    return (await shell.call('git', ['config', `remote.${remote}.url`])) === 0;
}

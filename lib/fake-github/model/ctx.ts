import {
    Clock,
    SystemClock,
} from '@lib/clock';
import {
    checkCall,
} from '@lib/shell';
import * as tmp from '@lib/tmp';
import fs from 'fs-extra';

export interface GithubModel {
    dir: string;
    workDir: string;
    clock: Clock;
    cleanup(): void;
}

type CreateGithubModelOptions = {
    /**
     * Default: Use System clock.
     */
    clock?: Clock;

    /**
     * Default: use a temporary directory.
     */
    dir?: string;
};

export async function createGithubModel(opts: CreateGithubModelOptions): Promise<GithubModel> {
    const clock = opts.clock || new SystemClock();
    let tmpDir: tmp.TmpDir | undefined = undefined;
    if (!opts.dir) {
        tmpDir = await tmp.dir({
            unsafeCleanup: true,
        });
    } else {
        await fs.mkdirs(opts.dir);
    }
    const dir = tmpDir ? tmpDir.path : opts.dir;
    if (!dir) {
        throw new Error(`dir is undefined, should not occur: ${dir}`);
    }
    const tmpWorkDir = await tmp.dir({
        unsafeCleanup: true,
    });
    await checkCall('git', ['init', '--bare'], { cwd: tmpWorkDir.path });
    return {
        cleanup(): void {
            if (tmpDir) {
                tmpDir.cleanup();
            }
            tmpWorkDir.cleanup();
        },
        clock,
        dir,
        workDir: tmpWorkDir.path,
    };
}

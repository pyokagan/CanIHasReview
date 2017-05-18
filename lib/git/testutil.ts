/**
 * @module
 * Test utilities.
 */
import {
    Shell,
    ShellOptions,
} from '@lib/shell';
import * as tmp from '@lib/tmp';
import fs from 'mz/fs';
import path from 'path';

/**
 * A temporary git repo meant for testing.
 */
export class TmpGitRepo {
    tmpDir: tmp.TmpDir;
    currentTime: number;
    shell: Shell;

    constructor(tmpDir: tmp.TmpDir) {
        this.tmpDir = tmpDir;
        this.currentTime = 1112911993;
        this.updateShell();
    }

    cleanup(): void {
        this.tmpDir.cleanup();
    }

    tick(): void {
        this.currentTime += 60;
        this.updateShell();
    }

    async checkCall(command: string, args: string[], options?: ShellOptions): Promise<void> {
        await this.shell.checkCall(command, args, options);
    }

    async checkOutput(command: string, args: string[], options?: ShellOptions): Promise<string> {
        return await this.shell.checkOutput(command, args, options);
    }

    async writeFile(filename: string, data: string): Promise<void> {
        await fs.writeFile(path.join(this.tmpDir.path, filename), data, 'utf-8');
    }

    private updateShell(): void {
        this.shell = new Shell({
            cwd: this.tmpDir.path,
            env: {
                EDITOR: ':',
                GIT_ATTR_NOSYSTEM: '1',
                GIT_AUTHOR_DATE: `${this.currentTime} -0700`,
                GIT_AUTHOR_EMAIL: 'author@example.com',
                GIT_AUTHOR_NAME: 'A U Thor',
                GIT_COMMITTER_DATE: `${this.currentTime} -0700`,
                GIT_COMMITTER_EMAIL: 'committer@example.com',
                GIT_COMMITTER_NAME: 'C O Mitter',
                GIT_CONFIG_NOSYSTEM: '1',
                GIT_MERGE_AUTOEDIT: 'no',
                GIT_MERGE_VERBOSITY: '5',
                HOME: this.tmpDir.path,
                LANG: 'C',
                LC_ALL: 'C',
                PAGER: 'cat',
                PATH: process.env.PATH,
                TZ: 'UTC',
            },
        });
    }
}

export async function makeTmpGitRepo(): Promise<TmpGitRepo> {
    const tmpDir = await tmp.dir({
        unsafeCleanup: true,
    });
    const repo = new TmpGitRepo(tmpDir);
    await repo.checkCall('git', ['init']);
    return repo;
}

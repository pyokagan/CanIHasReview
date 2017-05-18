import assert from 'assert';
import { suite, test } from 'mocha-typescript';
import { log } from './log';
import { makeTmpGitRepo, TmpGitRepo } from './testutil';

/**
 * Tests for {@link log}
 */
@suite('lib/git#log()')
export class LogTests {
    private repo: TmpGitRepo;

    async before(): Promise<void> {
        this.repo = await makeTmpGitRepo();
        await this.repo.writeFile('file', 'a');
        await this.repo.checkCall('git', ['add', 'file']);
        await this.repo.checkCall('git', ['commit', '-m', 'initial commit']);
    }

    after(): void {
        this.repo.cleanup();
    }

    @test
    async 'parses commit without parents'(): Promise<void> {
        const actual = await log(this.repo.shell);
        const expected = [{
            author: 'A U Thor <author@example.com> 1112911993 -0700',
            committer: 'C O Mitter <committer@example.com> 1112911993 -0700',
            message: 'initial commit',
            parents: [],
            sha: '018a7f0ea5029f9a7cfc6cb5515bb82c3b3246dd',
            tree: '8b308149c6ad3f16c60b2f9f884c54c31b74f7ac',
        }];
        assert.deepStrictEqual(actual, expected);
    }

    @test
    async 'parses commit with one parent'(): Promise<void> {
        await this.repo.writeFile('file', 'b');
        this.repo.tick();
        await this.repo.checkCall('git', ['commit', '-a', '-m', 'commit 2\n\nmessage']);
        const actual = await log(this.repo.shell);
        const expected = [{
            author: 'A U Thor <author@example.com> 1112912053 -0700',
            committer: 'C O Mitter <committer@example.com> 1112912053 -0700',
            message: 'commit 2\n\nmessage',
            parents: ['018a7f0ea5029f9a7cfc6cb5515bb82c3b3246dd'],
            sha: '5f77c4709dfd96b2075dceacb4fb50366a941bad',
            tree: 'b5e2c9f31c009877e81f6481322c1f4387b3a834',
        }, {
            author: 'A U Thor <author@example.com> 1112911993 -0700',
            committer: 'C O Mitter <committer@example.com> 1112911993 -0700',
            message: 'initial commit',
            parents: [],
            sha: '018a7f0ea5029f9a7cfc6cb5515bb82c3b3246dd',
            tree: '8b308149c6ad3f16c60b2f9f884c54c31b74f7ac',
        }];
        assert.deepStrictEqual(actual, expected);
    }

    @test
    async 'parses commit with two parents'(): Promise<void> {
        await this.repo.checkCall('git', ['checkout', '-b', 'side']);
        await this.repo.writeFile('file', 'side');
        this.repo.tick();
        await this.repo.checkCall('git', ['commit', '-a', '-m', 'side-commit']);
        await this.repo.checkCall('git', ['checkout', 'master']);
        this.repo.tick();
        await this.repo.checkCall('git', ['merge', '--no-ff', '--no-edit', 'side']);
        const actual = await log(this.repo.shell, ['HEAD^..HEAD']);
        const expected = [{
            author: 'A U Thor <author@example.com> 1112912113 -0700',
            committer: 'C O Mitter <committer@example.com> 1112912113 -0700',
            message: 'Merge branch \'side\'',
            parents: ['018a7f0ea5029f9a7cfc6cb5515bb82c3b3246dd', 'ad0ad359a13058cd8bb8b37085431377bf8936ac'],
            sha: 'f9f0e735987d8d67f0beb1c9a373887a5c07b985',
            tree: '0e2523f2c4b1d101163262b9bf82dcc8d34bb4c0',
        }, {
            author: 'A U Thor <author@example.com> 1112912053 -0700',
            committer: 'C O Mitter <committer@example.com> 1112912053 -0700',
            message: 'side-commit',
            parents: ['018a7f0ea5029f9a7cfc6cb5515bb82c3b3246dd'],
            sha: 'ad0ad359a13058cd8bb8b37085431377bf8936ac',
            tree: '0e2523f2c4b1d101163262b9bf82dcc8d34bb4c0',
        }];
        assert.deepStrictEqual(actual, expected);
    }

}

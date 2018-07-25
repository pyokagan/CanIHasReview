import {
    StaticClock,
} from '@lib/clock';
import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import {
    log,
} from './log';
import {
    makeTmpGitRepo,
    TmpGitRepo,
} from './testutil';

/**
 * Tests for {@link log}
 */
@suite('lib/git#log()')
export class LogTests {
    private clock: StaticClock;
    private repo: TmpGitRepo;

    async before(): Promise<void> {
        this.clock = new StaticClock(1112911993);
        this.repo = await makeTmpGitRepo({
            clock: this.clock,
        });
        await this.repo.writeFile('file', 'a');
        await this.repo.checkCall('git', ['add', 'file']);
        await this.repo.checkCall('git', ['commit', '-m', 'initial commit']);
    }

    after(): void {
        this.repo.cleanup();
    }

    @test
    async 'parses commit without parents'(): Promise<void> {
        const actual = await log(this.repo);
        const expected = [{
            author: 'A U Thor <author@example.com> 1112911993 +0000',
            committer: 'C O Mitter <committer@example.com> 1112911993 +0000',
            message: 'initial commit',
            parents: [],
            sha: 'fbcb4d0c8d1bf82d51a95a794b89917e8e8e8b7c',
            tree: '8b308149c6ad3f16c60b2f9f884c54c31b74f7ac',
        }];
        assert.deepStrictEqual(actual, expected);
    }

    @test
    async 'parses commit with one parent'(): Promise<void> {
        await this.repo.writeFile('file', 'b');
        this.clock.advance(60);
        await this.repo.checkCall('git', ['commit', '-a', '-m', 'commit 2\n\nmessage']);
        const actual = await log(this.repo);
        const expected = [{
            author: 'A U Thor <author@example.com> 1112912053 +0000',
            committer: 'C O Mitter <committer@example.com> 1112912053 +0000',
            message: 'commit 2\n\nmessage',
            parents: ['fbcb4d0c8d1bf82d51a95a794b89917e8e8e8b7c'],
            sha: 'b634b0cbb523f9cd78849d80e91fdc9b340dc9b5',
            tree: 'b5e2c9f31c009877e81f6481322c1f4387b3a834',
        }, {
            author: 'A U Thor <author@example.com> 1112911993 +0000',
            committer: 'C O Mitter <committer@example.com> 1112911993 +0000',
            message: 'initial commit',
            parents: [],
            sha: 'fbcb4d0c8d1bf82d51a95a794b89917e8e8e8b7c',
            tree: '8b308149c6ad3f16c60b2f9f884c54c31b74f7ac',
        }];
        assert.deepStrictEqual(actual, expected);
    }

    @test
    async 'parses commit with two parents'(): Promise<void> {
        await this.repo.checkCall('git', ['checkout', '-b', 'side']);
        await this.repo.writeFile('file', 'side');
        this.clock.advance(60);
        await this.repo.checkCall('git', ['commit', '-a', '-m', 'side-commit']);
        await this.repo.checkCall('git', ['checkout', 'master']);
        this.clock.advance(60);
        await this.repo.checkCall('git', ['merge', '--no-ff', '--no-edit', 'side']);
        const actual = await log(this.repo, ['HEAD^..HEAD']);
        const expected = [{
            author: 'A U Thor <author@example.com> 1112912113 +0000',
            committer: 'C O Mitter <committer@example.com> 1112912113 +0000',
            message: 'Merge branch \'side\'',
            parents: ['fbcb4d0c8d1bf82d51a95a794b89917e8e8e8b7c', '77e65f8c72a7e2afaccada561d2c7a28181d3295'],
            sha: '5938a6c156ab85d06e78925bceef5ebe9daa0765',
            tree: '0e2523f2c4b1d101163262b9bf82dcc8d34bb4c0',
        }, {
            author: 'A U Thor <author@example.com> 1112912053 +0000',
            committer: 'C O Mitter <committer@example.com> 1112912053 +0000',
            message: 'side-commit',
            parents: ['fbcb4d0c8d1bf82d51a95a794b89917e8e8e8b7c'],
            sha: '77e65f8c72a7e2afaccada561d2c7a28181d3295',
            tree: '0e2523f2c4b1d101163262b9bf82dcc8d34bb4c0',
        }];
        assert.deepStrictEqual(actual, expected);
    }

}

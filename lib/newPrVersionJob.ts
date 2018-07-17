/**
 * @module
 * Background job that creates a new PR version.
 */
import {
    RepoConfig,
} from '@config';
import {
    getCommitMessageSubject,
} from '@lib/git/util';
import * as github from '@lib/github';
import {
    Job,
} from '@lib/job';
import * as prstore from '@lib/prstore';
import {
    SimpleShell,
} from '@lib/shell';
import * as tmp from '@lib/tmp';
import {
    Console,
} from 'console';
import fetchPonyfill from 'fetch-ponyfill';

const { fetch } = fetchPonyfill();

export function escapeMarkdown(str: string): string {
    // via https://enterprise.github.com/downloads/en/markdown-cheatsheet.pdf
    // Markdown provides backslash escapes for \`*_[]{}()#+-.!
    return str.replace(/[\\`*_\[\]{}()#+-.!]/g, '\\$&');
}

/**
 * Format the comment to post to GitHub.
 */
export function formatComment(prInfo: github.PrInfo, prCommits: prstore.Commit[],
        version: number, interdiffSha?: string): string {
    const ownerEncoded = encodeURIComponent(prInfo.base.repo.owner.login);
    const repoEncoded = encodeURIComponent(prInfo.base.repo.name);

    const out: string[] = [];
    out.push(`# v${version}`);
    out.push('');

    out.push(`@${prInfo.user.login} submitted v${version} for review.`);
    out.push('');

    // Commit list
    prCommits.forEach((commit, i) => {
        const nr = `v${version} ${i + 1}/${prCommits.length}`;
        const subject = escapeMarkdown(getCommitMessageSubject(commit.message));
        const url = `https://github.com/${ownerEncoded}/${repoEncoded}/pull/${prInfo.number}/commits/${commit.sha}`;
        out.push(`* [${nr}] [${subject}](${url})`);
    });
    out.push('');

    const miniBar: string[] = [];

    // miniBar: Archive
    const archiveUrl = `https://github.com/${ownerEncoded}/${repoEncoded}/compare/` +
        `${prInfo.base.sha}...${prInfo.head.sha}`;
    miniBar.push(`([:books: Archive](${archiveUrl}))`);

    // miniBar: Interdiff
    if (interdiffSha) {
        const interdiffUrl = `https://github.com/${ownerEncoded}/${repoEncoded}/compare/` +
            `${interdiffSha}~1...${interdiffSha}`;
        miniBar.push(`([:chart_with_upwards_trend: Interdiff between ` +
            `v${version - 1} and v${version}](${interdiffUrl}))`);
    }

    out.push(miniBar.join(' '));

    // Help
    out.push('<details>');
    out.push('<summary>Checkout this PR version locally</summary>');
    out.push('');
    out.push('```sh');
    out.push(`git fetch https://github.com/${ownerEncoded}/${repoEncoded}.git ` +
        `refs/pr/${prInfo.number}/${version}/head:BRANCHNAME`);
    out.push('```');
    out.push('where `BRANCHNAME` is the name of the local branch you wish to fetch this PR to.');
    out.push('');
    out.push('</details>');

    return out.join('\n');
}

interface JobOptions {
    githubToken: string;
    prInfo: github.PrInfo;
    repoConfig: RepoConfig;
}

export function makeNewVersionJob(opts: JobOptions): Job<void> {
    return async (name, outStream) => {
        // TODO: Check for merge commits
        const console = new Console(outStream);

        const repoFullName = opts.prInfo.base.repo.full_name;
        const owner = opts.prInfo.base.repo.owner.login;
        const repo = opts.prInfo.base.repo.name;
        const prNumber = opts.prInfo.number;

        const tmpDir = await tmp.dir({
            unsafeCleanup: true,
        });
        const shell = new SimpleShell({
            console,
            cwd: tmpDir.path,
            stderr: outStream,
            stdout: outStream,
        });

        let nextVersion: number;
        let newVersion: prstore.Version;
        let prCommits: prstore.Commit[];
        try {
            const url = `https://${opts.githubToken}@github.com/${repoFullName}.git`;
            await prstore.initWorkRepo(shell, url);

            await prstore.fetchPr(shell, prNumber);

            nextVersion = (await prstore.getVersions(shell, prNumber)).length;
            if (!nextVersion) {
                nextVersion = 1;
            }

            // TODO: Using opts.prInfo.base.sha is WRONG! It is not the fork point from the
            // master branch, but rather where the master branch is when the PR was updated.
            newVersion = await prstore.makeVersion(shell, prNumber, nextVersion,
                opts.prInfo.base.sha, opts.prInfo.head.sha);
            await prstore.pushVersions(shell, prNumber, [nextVersion]);

            prCommits = await prstore.getVersionCommits(shell, prNumber, nextVersion);
        } finally {
            tmpDir.cleanup();
        }

        // Post comment
        const ghBotApi = github.createApi({
            fetch,
            token: opts.githubToken,
            userAgent: 'CanIHasReview',
        });
        const commentBody = formatComment(opts.prInfo, prCommits, nextVersion, newVersion.interdiff);
        await github.postIssueComment(ghBotApi, owner, repo, prNumber, commentBody);

        // Labels
        try {
            if (opts.repoConfig.addLabelsOnSubmit || opts.repoConfig.removeLabelsOnSubmit) {
                await processLabels(ghBotApi, owner, repo, prNumber, opts.repoConfig.removeLabelsOnSubmit,
                    opts.repoConfig.addLabelsOnSubmit);
            }
        } catch (e) {
            console.warn('Failed to apply labels.');
            console.warn(e.stack);
        }

        // Re-request reviews
        try {
            await rerequestReviews(ghBotApi, owner, repo, prNumber);
        } catch (e) {
            console.warn('Failed to re-request reviews.');
            console.warn(e.stack);
        }
    };
}

/**
 * Add/remove labels from the specified PR.
 */
export async function processLabels(fetch: github.Fetch, owner: string, repo: string, pr: number,
        removeLabels?: string[], addLabels?: string[]): Promise<void> {
    const prLabels = await github.getIssueLabels(fetch, owner, repo, pr);
    const prLabelNames = new Set(prLabels.map(x => x.name));
    if (removeLabels) {
        for (const labelName of removeLabels) {
            prLabelNames.delete(labelName);
        }
    }
    if (addLabels) {
        for (const labelName of addLabels) {
            prLabelNames.add(labelName);
        }
    }
    await github.setIssueLabels(fetch, owner, repo, pr, Array.from(prLabelNames));
}

/**
 * Re-request reviews from reviewers who have requested changes.
 */
export async function rerequestReviews(fetch: github.Fetch, owner: string, repo: string, pr: number): Promise<void> {
    const collaborators = new Set<string>();
    await github.forEachRepoCollaborator(fetch, owner, repo, collaborator => {
        collaborators.add(collaborator.login);
    });
    const pastReviews = await github.summarizePrReviews(fetch, owner, repo, pr);
    const reviewers = Object.keys(pastReviews)
        .filter(login => collaborators.has(login) && pastReviews[login].state !== 'APPROVED');
    if (reviewers.length > 0) {
        await github.createPrReviewRequest(fetch, owner, repo, pr, reviewers);
    }
}

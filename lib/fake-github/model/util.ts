import * as git from '@lib/git';
import {
    GithubCommit,
} from '@lib/github';

/**
 * @param time Time in ms
 */
export function getTimestamp(time: number): string {
    const lp = leftpad;
    const d = new Date(time);
    const dateString = `${d.getUTCFullYear()}-${lp(d.getUTCMonth() + 1, 2)}-${lp(d.getUTCDay() + 1, 2)}`;
    const timeString = `${lp(d.getUTCHours(), 2)}:${lp(d.getUTCMinutes(), 2)}:${lp(d.getUTCSeconds(), 2)}`;
    return `${dateString}T${timeString}Z`;
}

function leftpad(num: number, targetLength: number): string {
    const s = String(num);
    if (s.length > targetLength) {
        return s;
    } else {
        const padLength = targetLength - s.length;
        const padString = '0'.repeat(padLength);
        return padString + s;
    }
}

export function gitCommitToGithubCommit(val: git.Commit): GithubCommit {
    const authorIdent = git.splitIdent(val.author);
    if (!authorIdent) {
        throw new Error(`TODO: don't know how to handle splitIdent() returning undefined: ${val.author}`);
    }
    const committerIdent = git.splitIdent(val.committer);
    if (!committerIdent) {
        throw new Error(`TODO: don't know how to handle splitIdent() returning undefined: ${val.committer}`);
    }
    const commit = {
        author: {
            date: `${authorIdent.date} ${authorIdent.tz}`,
            email: authorIdent.email,
            name: authorIdent.name,
        },
        comment_count: 0,
        committer: {
            date: `${committerIdent.date} ${committerIdent.tz}`,
            email: committerIdent.email,
            name: committerIdent.name,
        },
        message: val.message,
        tree: {
            sha: val.tree,
        },
    };
    const parents = val.parents.map(sha => { return { sha }; });
    return {
        author: null,
        commit,
        committer: null,
        html_url: '',
        parents,
        sha: val.sha,
    };
}

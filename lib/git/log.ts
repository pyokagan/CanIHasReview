import Shell from '@lib/shell';
import isObjectLike from 'lodash/isObjectLike';
import {
    splitLines,
} from './util';

/**
 * Represents commit information given by `git-log`.
 */
export interface Commit {
    sha: string;
    parents: string[];
    tree: string;
    author: string;
    committer: string;
    message: string;
}

/**
 * Returns true if `value` implements {@link Commit}, false otherwise.
 */
export function isCommit(value: any): value is Commit {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<Commit> = value;
    return typeof obj.sha === 'string' &&
        Array.isArray(obj.parents) &&
        typeof obj.tree === 'string' &&
        typeof obj.author === 'string' &&
        typeof obj.committer === 'string' &&
        typeof obj.message === 'string';
}

/**
 * Parse git-log raw lines into commits.
 */
function parseLines(lines: string[]): Commit[] {
    let state = 0;
    let commit: Partial<Commit> = {};
    let messageLines: string[] = [];
    const commits: Commit[] = [];
    for (const line of lines) {
        switch (state) {
        case 0:
            commit = { parents: [] };
            messageLines = [];
            state++;
            // falls through
        case 1: { // look for commit line, ignore everything else
            if (line.startsWith('commit ')) {
                commit.sha = line.substring('commit '.length);
                state++;
            }
        } break;
        case 2: { // handle commit header
            // empty line signals end of header
            if (!line.length) {
                state++;
                break;
            }

            const spaceIdx = line.indexOf(' ');
            const key = line.slice(0, spaceIdx >= 0 ? spaceIdx : line.length);
            const value = line.slice(spaceIdx >= 0 ? spaceIdx + 1 : line.length);

            switch (key) {
            case 'parent':
                if (!commit.parents) {
                    throw new Error('commit.parents is not an array: should not happen');
                }
                commit.parents.push(value);
                break;
            case 'tree':
                commit.tree = value;
                break;
            case 'author':
                commit.author = value;
                break;
            case 'committer':
                commit.committer = value;
                break;
            default:
                // ignore unknown key
            }
        } break;
        case 3: { // handle commit message
            // empty line signals end of commit message
            if (!line.length) {
                commit.message = messageLines.join('\n');
                if (!isCommit(commit)) {
                    throw new Error('commit values not filled out: should not happen');
                }
                commits.push(commit);
                state = 0;
                break;
            }

            messageLines.push(line.slice(4));
        } break;
        default:
            throw new Error(`invalid state ${state}`);
        }
    }

    if (state >= 3) {
        commit.message = messageLines.join('\n');
        if (!isCommit(commit)) {
            throw new Error('commit values not filled out: should not happen');
        }
        commits.push(commit);
    }

    return commits;
}

/**
 * Parses the output returned by `git-log --format=raw`
 */
export function parse(output: string): Commit[] {
    return parseLines(splitLines(output));
}

/**
 * Runs `git log --format=raw` and parses its output.
 *
 * @param shell {@link Shell} object to run the command with.
 * @param args Additional arguments to pass to it.
 */
export async function log(shell: Shell, args?: string[]): Promise<Commit[]> {
    if (!args) {
        args = [];
    }
    const logArgs = [ 'log', '--format=raw' ];
    logArgs.push.apply(logArgs, args);
    const output = await shell.checkOutput('git', logArgs);
    return parse(output);
}

export default log;

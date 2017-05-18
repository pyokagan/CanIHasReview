import Shell from '@lib/shell';
import {
    splitLines,
} from './util';

export interface Status {
    path: string;
    xy: string;
}

function parseLines(lines: string[]): Status[] {
    const statuses: Status[] = [];
    for (const line of lines) {
        // TODO: handle quoted paths
        // TODO: handle PATH1 -> PATH2
        const result = /^(..) (.+)$/.exec(line);
        if (!result) {
            continue; // skip line
        }
        statuses.push({
            path: result[2],
            xy: result[1],
        });
    }
    return statuses;
}

/**
 * Parse `git-status` porcelain output into an array of {@link Status}
 */
export function parse(output: string): Status[] {
    return parseLines(splitLines(output));
}

/**
 * Runs `git status --porcelain` and parses its output.
 *
 * @param shell {@link Shell} object to run the command with.
 * @param args Additional arguments to pass to it.
 */
export async function status(shell: Shell, args?: string[]): Promise<Status[]> {
    if (!args) {
        args = [];
    }
    const statusArgs = ['status', '--porcelain'];
    statusArgs.push.apply(statusArgs, args);
    const output = await shell.checkOutput('git', statusArgs);
    return parse(output);
}

export default status;

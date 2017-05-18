/**
 * @module
 * Shared utility functions.
 */

/**
 * Split text into lines.
 */
export function splitLines(text: string): string[] {
    const lines = text.split('\n');
    if (text[text.length - 1] === '\n') {
        lines.length--;
    }
    return lines;
}

/**
 * Extracts the subject (first line) of a commit message.
 */
export function getCommitMessageSubject(commitMessage: string): string {
    const idx = commitMessage.indexOf('\n\n');
    return (idx >= 0 ? commitMessage.slice(0, idx) : commitMessage).replace(/\n/, ' ');
}

/**
 * Extracts the body of a commit message.
 */
export function getCommitMessageBody(commitMessage: string): string {
    const idx = commitMessage.indexOf('\n\n');
    return idx >= 0 ? commitMessage.slice(idx + 2) : '';
}

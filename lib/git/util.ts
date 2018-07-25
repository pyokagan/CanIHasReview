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

interface Ident {
    name: string;
    email: string;
    date?: string;
    tz?: string;
}

export function splitIdent(ident: string): Ident | undefined {
    let mailStartIdx = ident.indexOf('<');
    if (mailStartIdx >= 0) {
        mailStartIdx += 1;
    } else {
        return;
    }

    let nameEndIdx = 0;
    for (let i = mailStartIdx - 2; i >= 0; i--) {
        if (!isSpace(ident.charAt(i))) {
            nameEndIdx = i + 1;
            break;
        }
    }

    const mailEndIdx = ident.indexOf('>', mailStartIdx);
    if (mailEndIdx < 0) {
        return;
    }

    // At this point, we have found the name and email.
    const name = ident.substring(0, nameEndIdx);
    const email = ident.substring(mailStartIdx, mailEndIdx);

    // Look from the end-of-line to find the trailing ">" of the mail
    // address, even though we should already know it as mailEndIdx.
    // This can help in cases of broken idents with an extra ">" somewhere
    // in the email address. Note that we are assuming the timestamp will
    // never have a ">" in it.
    //
    // Note that we will always find some ">" because we already found the
    // mailEndIdx closing bracket.
    let cp = ident.lastIndexOf('>') + 1;
    while (cp < ident.length && isSpace(ident.charAt(cp))) {
        cp++;
    }
    if (cp >= ident.length) {
        return { email, name }; // Person only
    }

    const dateBeginIdx = cp;
    let dateEndIdx = dateBeginIdx;
    while (dateEndIdx < ident.length && '0123456789'.indexOf(ident.charAt(dateEndIdx)) >= 0) {
        dateEndIdx++;
    }
    if (dateBeginIdx === dateEndIdx) {
        return { email, name }; // Person only
    }

    cp = dateEndIdx;
    while (cp < ident.length && isSpace(ident.charAt(cp))) {
        cp++;
    }

    if (cp >= ident.length || '+-'.indexOf(ident.charAt(cp)) < 0) {
        return { email, name }; // Person only
    }

    const tzBeginIdx = cp;
    let tzEndIdx = tzBeginIdx + 1;
    while (tzEndIdx < ident.length && '0123456789'.indexOf(ident.charAt(tzEndIdx)) >= 0) {
        tzEndIdx++;
    }
    if (tzBeginIdx + 1 === tzEndIdx) {
        return { email, name }; // Person only
    }

    const date = ident.substring(dateBeginIdx, dateEndIdx);
    const tz = ident.substring(tzBeginIdx, tzEndIdx);

    return {
        date,
        email,
        name,
        tz,
    };
}

function isSpace(c: string): boolean {
    return c === ' ' || c === '\f' || c === '\n' || c === '\r' ||
        c === '\t' || c === '\v';
}

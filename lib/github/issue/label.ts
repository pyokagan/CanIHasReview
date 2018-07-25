/**
 * @module
 * https://developer.github.com/v3/issues/labels/
 */
import every from 'lodash/every';
import isObjectLike from 'lodash/isObjectLike';
import qs from 'querystringify';
import {
    checkResponseOk,
} from '../check';
import {
    JsonValidationError,
} from '../errors';
import {
    Fetch,
} from '../fetch';
import {
    forEachPage,
} from '../pagination';

/**
 * Represents a GitHub label.
 */
export interface Label {
    id: number;
    name: string;
}

/**
 * Returns true if `value` implements {@link Label}, false otherwise.
 */
export function isLabel(value: any): value is Label {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<Label> = value;
    return typeof obj.id === 'number' &&
        typeof obj.name === 'string';
}

/**
 * Options for {@link forEachIssueLabel}
 */
export interface ForEachIssueLabelOptions {
    per_page?: number;
}

/**
 * List labels on an issue.
 */
export function forEachIssueLabel(fetch: Fetch, owner: string, repo: string,
    issue: number | string, opts: ForEachIssueLabelOptions,
    fn: (label: Label) => (Promise<void> | void)): Promise<void>;

/**
 * List labels on an issue.
 */
export function forEachIssueLabel(fetch: Fetch, owner: string, repo: string,
    issue: number | string,
    fn: (label: Label) => (Promise<void> | void)): Promise<void>;

export async function forEachIssueLabel(fetch: Fetch, owner: string, repo: string,
        issue: number | string,
        optsOrFn: any, fnOrNone?: any): Promise<void> {
    const opts: ForEachIssueLabelOptions = fnOrNone ? optsOrFn : {};
    const fn: (label: Label) => (Promise<void> | void) = fnOrNone || optsOrFn;
    const query = qs.stringify(opts);
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const issueEncoded = encodeURIComponent(String(issue));
    const url = `repos/${ownerEncoded}/${repoEncoded}/issues/${issueEncoded}/labels${query ? '?' : ''}${query}`;
    await forEachPage(fetch, url, {}, async (json) => {
        if (!Array.isArray(json) || !every(json.map(isLabel))) {
            throw new JsonValidationError(json);
        }

        for (const label of json) {
            const result = fn(label);
            if (result) {
                await result;
            }
        }
    });
}

/**
 * List labels on an issue.
 */
export async function getIssueLabels(fetch: Fetch, owner: string,
        repo: string, issue: number | string,
        opts?: ForEachIssueLabelOptions): Promise<Label[]> {
    const labels: Label[] = [];
    await forEachIssueLabel(fetch, owner, repo, issue, opts || {}, label => {
        labels.push(label);
    });
    return labels;
}

/**
 * Replace all labels for an issue.
 */
export async function setIssueLabels(fetch: Fetch, owner: string, repo: string,
        issue: number | string, labels: string[]): Promise<Label[]> {
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const issueEncoded = encodeURIComponent(String(issue));
    const url = `repos/${ownerEncoded}/${repoEncoded}/issues/${issueEncoded}/labels`;
    const resp = await fetch(url, {
        body: JSON.stringify(labels),
        method: 'PUT',
    });
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!Array.isArray(json) || !every(json.map(isLabel))) {
        throw new JsonValidationError(json);
    }
    return json;
}

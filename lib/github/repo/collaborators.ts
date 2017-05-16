/**
 * @module
 * https://developer.github.com/v3/repos/collaborators/
 */
import every from 'lodash/every';
import isObjectLike from 'lodash/isObjectLike';
import qs from 'querystringify';
import {
    JsonValidationError,
} from '../errors';
import {
    Fetch,
} from '../fetch';
import {
    forEachPage,
} from '../pagination';
import {
    isMiniPublicUserInfo,
    MiniPublicUserInfo,
} from '../user';

/**
 * Represents a repo collaborator.
 */
export interface Collaborator extends MiniPublicUserInfo {
    permissions: {
        pull: boolean;
        push: boolean;
        admin: boolean;
    };
}

/**
 * Returns true if `value` implements {@link Collaborator}, false otherwise.
 */
export function isCollaborator(value: any): value is Collaborator {
    if (!isMiniPublicUserInfo(value)) {
        return false;
    }

    const obj: Partial<Collaborator> = value;
    return (obj.permissions || false) &&
        isObjectLike(obj.permissions) &&
        typeof obj.permissions.pull === 'boolean' &&
        typeof obj.permissions.push === 'boolean' &&
        typeof obj.permissions.admin === 'boolean';
}

/**
 * Options for {@link forEachRepoCollaborator}.
 */
export interface ForEachRepoCollaboratorOptions {
    /**
     * Filter collaborators returned by their affiliation.
     */
    affiliation?: 'outside' | 'direct' | 'all';

    per_page?: number;
}

/**
 * List collaborators.
 */
export function forEachRepoCollaborator(fetch: Fetch, owner: string, repo: string,
    opts: ForEachRepoCollaboratorOptions,
    fn: (c: Collaborator) => (Promise<void> | void)): Promise<void>;

/**
 * List collaborators.
 */
export function forEachRepoCollaborator(fetch: Fetch, owner: string, repo: string,
    fn: (c: Collaborator) => (Promise<void> | void)): Promise<void>;

export async function forEachRepoCollaborator(fetch: Fetch, owner: string, repo: string,
        optsOrFn: any, fnOrNone?: any): Promise<void> {
    const opts: ForEachRepoCollaboratorOptions = fnOrNone ? optsOrFn : {};
    const fn: (c: Collaborator) => (Promise<void> | void) = fnOrNone || optsOrFn;
    const query = qs.stringify(opts);
    const ownerEncoded = encodeURIComponent(owner);
    const repoEncoded = encodeURIComponent(repo);
    const url = `repos/${ownerEncoded}/${repoEncoded}/collaborators${query ? '?' : ''}${query}`;
    await forEachPage(fetch, url, {}, async (json) => {
        if (!Array.isArray(json) || !every(json.map(isCollaborator))) {
            throw new JsonValidationError(json);
        }

        for (const collaborator of json) {
            const result = fn(collaborator);
            if (result) {
                await result;
            }
        }
    });
}

/**
 * List collaborators.
 */
export async function getRepoCollaborators(fetch: Fetch, owner: string, repo: string,
        opts?: ForEachRepoCollaboratorOptions): Promise<Collaborator[]> {
    const collaborators: Collaborator[] = [];
    await forEachRepoCollaborator(fetch, owner, repo, opts || {}, collaborator => {
        collaborators.push(collaborator);
    });
    return collaborators;
}

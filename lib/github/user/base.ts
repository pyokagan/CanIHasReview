/**
 * @module
 * GitHub users API.
 * See: https://developer.github.com/v3/users/
 */
import isObjectLike from 'lodash/isObjectLike';
import {
    checkResponseOk,
} from '../check';
import {
    JsonValidationError,
} from '../errors';
import {
    Fetch,
} from '../fetch';

const UserType_obj = {
    'Organization': 0,
    'User': 0,
};
type UserType = keyof typeof UserType_obj;
const UserType = Object.keys(UserType_obj) as UserType[];

/**
 * Mini public user information that contains only a few fields.
 */
export interface MiniPublicUserInfo {
    login: string;
    id: number;
    avatar_url: string;
    type: UserType;
    site_admin: boolean;
}

/**
 * Returns true if `value` implements {@link MiniPublicUserInfo}, false otherwise.
 */
export function isMiniPublicUserInfo(value: any): value is MiniPublicUserInfo {
    if (!isObjectLike(value)) {
        return false;
    }

    const obj: Partial<MiniPublicUserInfo> = value;
    return typeof obj.login === 'string' &&
        typeof obj.id === 'number' &&
        typeof obj.avatar_url === 'string' &&
        typeof obj.type === 'string' &&
        UserType.indexOf(obj.type) >= 0 &&
        typeof obj.site_admin === 'boolean';
}

/**
 * Public User information.
 */
export interface PublicUserInfo extends MiniPublicUserInfo {
    name: string;
    company: string | null;
    blog: string;
    location: string | null;

    /**
     * The user's publicly visible email address
     * (or `null` if the user has not specified a public email address in their profile).
     * The publicly visible email address is only non-null for authenticated API users.
     */
    email: string | null;

    hireable: boolean | null;
    bio: string | null;
    public_repos: number;
    public_gists: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
}

/**
 * Returns true if val implements {@link PublicUserInfo}, false otherwise.
 */
export function isPublicUserInfo(val: any): val is PublicUserInfo {
    if (typeof val !== 'object' || !isMiniPublicUserInfo(val)) {
        return false;
    }

    const obj: Partial<PublicUserInfo> = val;
    return typeof obj.name === 'string' &&
        (typeof obj.company === 'string' || obj.company === null) &&
        typeof obj.blog === 'string' &&
        (typeof obj.location === 'string' || obj.location === null) &&
        (typeof obj.email === 'string' || obj.email === null) &&
        (typeof obj.hireable === 'boolean' || obj.hireable === null) &&
        (typeof obj.bio === 'string' || obj.bio === null) &&
        typeof obj.public_repos === 'number' &&
        typeof obj.public_gists === 'number' &&
        typeof obj.followers === 'number' &&
        typeof obj.following === 'number' &&
        typeof obj.created_at === 'string' &&
        typeof obj.updated_at === 'string';
}

/**
 * Returns user info for the specified user.
 */
export async function getUserInfo(fetch: Fetch, username: string): Promise<PublicUserInfo> {
    const usernameEncoded = encodeURIComponent(username);
    const resp = await fetch(`users/${usernameEncoded}`);
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isPublicUserInfo(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

/**
 * Returns user info for the currently authenticated user.
 */
export async function getAuthenticatedUserInfo(fetch: Fetch): Promise<PublicUserInfo> {
    const resp = await fetch('user');
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isPublicUserInfo(json)) {
        throw new JsonValidationError(json);
    }
    return json;
}

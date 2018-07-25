/**
 * @module
 * https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/
 */
import isObjectLike from 'lodash/isObjectLike';
import {
    checkResponseOk,
} from './check';
import {
    JsonValidationError,
} from './errors';
import {
    Fetch,
} from './fetch';

const Scope_obj = {
    'admin:gpg_key': 0,
    'admin:org': 0,
    'admin:org_hook': 0,
    'admin:public_key': 0,
    'admin:repo_hook': 0,
    'delete_repo': 0,
    'gist': 0,
    'notifications': 0,
    'public_repo': 0,
    'read:discussion': 0,
    'read:gpg_key': 0,
    'read:org': 0,
    'read:public_key': 0,
    'read:repo_hook': 0,
    'read:user': 0,
    'repo': 0,
    'repo:invite': 0,
    'repo:status': 0,
    'repo_deployment': 0,
    'user': 0,
    'user:email': 0,
    'user:follow': 0,
    'write:discussion': 0,
    'write:gpg_key': 0,
    'write:org': 0,
    'write:public_key': 0,
    'write:repo_hook': 0,
};
export type Scope = keyof typeof Scope_obj;
export const Scope = Object.keys(Scope_obj) as Scope[];

export function isScope(x: any): x is Scope {
    return typeof x === 'string' &&
        Scope.indexOf(x as Scope) >= 0;
}

type AuthorizationUrlOptions = {
    /**
     * The client ID you received from GitHub when you registered.
     */
    clientId: string;

    /**
     * The URL in your application where users will be sent after authorization.
     */
    redirectUri?: string;

    /**
     * List of scopes.
     * If not provided, defaults to an empty list for users that have not authorized any
     * scopes for the application.
     * For users who have authorized scopes for the application, the user won't be shown the
     * OAuth authorization page with the list of scopes.
     * Instead, this step of the flow will automatically complete with the set of scopes the
     * user has authorized for the application.
     */
    scopes?: Scope[];

    /**
     * An unguessable random string.
     * It is used to protect against cross-site request forgery attacks.
     */
    state?: string;

    /**
     * Whether or not unauthenticated users will be offered an option to
     * sign up for GitHub during the OAuth flow.
     */
    allowSignup?: boolean;
};

export function getAuthorizationUrl(options: AuthorizationUrlOptions): string {
    const items = new Map<string, string>();
    items.set('client_id', options.clientId);
    if (typeof options.redirectUri !== 'undefined') {
        items.set('redirect_uri', options.redirectUri);
    }
    if (typeof options.scopes !== 'undefined') {
        items.set('scope', options.scopes.join(' '));
    }
    if (typeof options.state !== 'undefined') {
        items.set('state', options.state);
    }
    if (typeof options.allowSignup !== 'undefined') {
        items.set('allow_signup', options.allowSignup ? 'true' : 'false');
    }

    const joinedItems: string[] = [];
    for (const [k, v] of items) {
        joinedItems.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }

    return `https://github.com/login/oauth/authorize?${joinedItems.join('&')}`;
}

type ExchangeTokenOptions = {
    fetch: Fetch;
    clientId: string;
    clientSecret: string;
    code: string;
    redirectUri?: string;
    state?: string;
};

interface ExchangeTokenResponse {
    access_token: string;
    token_type: string;
}

function isExchangeTokenResponse(x: any): x is ExchangeTokenResponse {
    if (!isObjectLike(x)) {
        return false;
    }

    const obj: Partial<ExchangeTokenResponse> = x;
    return typeof obj.access_token === 'string' &&
        typeof obj.token_type === 'string';
}

export async function exchangeToken(options: ExchangeTokenOptions): Promise<string> {
    const { fetch } = options;
    const items = new Map<string, string>();
    items.set('client_id', options.clientId);
    items.set('client_secret', options.clientSecret);
    items.set('code', options.code);
    if (typeof options.redirectUri !== 'undefined') {
        items.set('redirect_uri', options.redirectUri);
    }
    if (typeof options.state !== 'undefined') {
        items.set('state', options.state);
    }

    const joinedItems: string[] = [];
    for (const [k, v] of items) {
        joinedItems.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }

    const resp = await fetch(`https://github.com/login/oauth/access_token?${joinedItems.join('&')}`, {
        headers: {
            Accept: 'application/json',
        },
    });
    await checkResponseOk(resp);
    const json = await resp.json();
    if (!isExchangeTokenResponse(json)) {
        throw new JsonValidationError(json);
    }
    return json.access_token;
}

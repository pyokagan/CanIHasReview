import {
    Route,
} from '@lib/http/route';

// == oauth ==

export interface OauthAccessTokenRouteParams {
    client_id?: string;
    client_secret?: string;
    code?: string;
    redirect_uri?: string;
    state?: string;
}
export const oauthAccessTokenRoute = new Route<OauthAccessTokenRouteParams>(
    '/login/oauth/access_token',
    ['client_id', 'client_secret', 'code', 'redirect_uri', 'state']);

// == user ==

// Get a single user
export interface UsersRouteParams {
    username: string;
}
export const usersRoute = new Route<UsersRouteParams>('/users/:username');

// Get/update the authenticated user
export const userRoute = new Route<{}>('/user');

export const userRoutes = [
    usersRoute,
    userRoute,
];

// == repos ==

// Get repo info
export interface ReposRouteParams {
    owner: string;
    repo: string;
}
export const reposRoute = new Route<ReposRouteParams>('/repos/:owner/:repo');

// == repos/branch ==

// Get branch info
export interface ReposBranchesRouteParams extends ReposRouteParams {
    branch: string;
}
export const reposBranchesRoute: Route<ReposBranchesRouteParams> =
    reposRoute.extend('branches/:branch');

// == repos/collaborators ==

// List collaborators
export interface ReposListCollaboratorsRouteParams extends ReposRouteParams {}
export const reposListCollaboratorsRoute: Route<ReposListCollaboratorsRouteParams> =
    reposRoute.extend('collaborators');

// == repos/commits ==

// List commits
export interface ReposListCommitsRouteParams extends ReposRouteParams {
    /**
     * SHA or branch to start listing commits from.
     * Default: the repository's default branch (usually `master`).
     */
    sha?: string;

    /**
     * Only commits containing this file path will be returned.
     */
    path?: string;

    /**
     * GitHub login or email address by which to filter by commit author.
     */
    author?: string;

    /**
     * Only commits after this date will be returned.
     * This is a timestamp in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`
     */
    since?: string;

    /**
     * Only commits before this date will be returned.
     * This is a timestamp in ISO 8601 format: `YYYY-MM-DDTHH:MM:SSZ`
     */
    until?: string;
}
export const reposListCommitsRoute: Route<ReposListCommitsRouteParams> =
    reposRoute.extend('commits', ['sha', 'path', 'author', 'since', 'until']);

export const repoRoutes = [
    reposRoute,
    reposBranchesRoute,
    reposListCollaboratorsRoute,
    reposListCommitsRoute,
];

// == issues ==

export interface PrInfoRouteParams {
    owner: string;
    repo: string;
    nr: string;
}
export const prInfoRoute = new Route<PrInfoRouteParams>('/repos/:owner/:repo/pulls/:nr');

export interface PrCommitsRouteParams {
    owner: string;
    repo: string;
    nr: string;
}
export const prCommitsRoute = new Route<PrCommitsRouteParams>('/repos/:owner/:repo/pulls/:nr/commits');

export interface IssueCommentsRouteParams {
    owner: string;
    repo: string;
    nr: string;
}
export const issueCommentsRoute = new Route<IssueCommentsRouteParams>('/repos/:owner/:repo/issues/:nr/comments');

export const issueRoutes = [
    prInfoRoute,
    prCommitsRoute,
    issueCommentsRoute,
];

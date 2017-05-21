import Route from '../lib/koa-route';

export interface HomeRouteParams {}
export const homeRoute = new Route<HomeRouteParams>('/');

export interface AuthRouteParams {}
export const authRoute = new Route<AuthRouteParams>('/auth');

export interface JobRouteParams {
    name: string;
}
export const jobRoute = new Route<JobRouteParams>('/site/job/:name');

export interface PullRouteParams {
    owner: string;
    repo: string;
    pr: string;
}
export const pullRoute = new Route<PullRouteParams>('/:owner/:repo/pull/:pr');

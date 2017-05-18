import {
    Route,
} from '@lib/http/route';

// == home ==

export interface HomeRouteParams {}
export const homeRoute = new Route<HomeRouteParams>('/');

// == auth ==

interface AuthRouteParams {}
const baseAuthRoute = new Route<AuthRouteParams>('/auth');

export interface AuthLoginRouteParams extends AuthRouteParams {
    redirect?: string;
}
export const authLoginRoute: Route<AuthLoginRouteParams> = baseAuthRoute.extend('login', ['redirect']);

export interface AuthLoginCallbackRouteParams extends AuthRouteParams {
    redirect?: string;
    code?: string;
}
export const authLoginCallbackRoute: Route<AuthLoginCallbackRouteParams> =
    baseAuthRoute.extend('loginCallback', ['redirect', 'code']);

export interface AuthLogoutRouteParams extends AuthRouteParams {}
export const authLogoutRoute: Route<AuthLogoutRouteParams> = baseAuthRoute.extend('logout');

export const authRoutes = [authLoginRoute, authLoginCallbackRoute, authLogoutRoute];

// == job ==

export interface JobRouteParams {
    name: string;
}
export const jobRoute = new Route<JobRouteParams>('/site/job/:name');

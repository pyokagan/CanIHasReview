import Route from '../lib/koa-route';

export interface HomeRouteParams {}
export const homeRoute = new Route<HomeRouteParams>('/');

export interface AuthRouteParams {}
export const authRoute = new Route<AuthRouteParams>('/auth');

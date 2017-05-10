import Route from '../lib/koa-route';

export interface HomeRouteParams {}
export const homeRoute = new Route<HomeRouteParams>('/');

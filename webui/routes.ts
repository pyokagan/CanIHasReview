import {
    Route,
} from '@lib/http/route';

export interface HomeRouteParams {}
export const homeRoute = new Route<HomeRouteParams>('/');

import {
    Route,
} from '@lib/http/route';

// == home ==

export interface HomeRouteParams {}
export const homeRoute = new Route<HomeRouteParams>('/');

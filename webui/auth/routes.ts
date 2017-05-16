/**
 * @module
 * Auth controller routes.
 */

import Route from '../../lib/koa-route';
import { authRoute as baseRoute, AuthRouteParams as BaseRouteParams } from '../routes';

export interface LoginRouteParams extends BaseRouteParams {}
export const loginRoute: Route<LoginRouteParams> = baseRoute.extend('login');

export interface LoginCallbackRouteParams extends BaseRouteParams {}
export const loginCallbackRoute: Route<LoginCallbackRouteParams> = baseRoute.extend('loginCallback');

export interface LogoutRouteParams extends BaseRouteParams {}
export const logoutRoute: Route<LogoutRouteParams> = baseRoute.extend('logout');

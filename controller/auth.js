"use strict";
const path = require('path');
const fs = require('fs');
const qs = require('querystring');
const url = require('url');
const route = require('koa-route');
const compose = require('koa-compose');
const simple_oauth2 = require('simple-oauth2');
const github = require('../lib/github');


module.exports = function(env, baseRoute, scope) {
  if (!env.GITHUB_CLIENT_ID)
    throw new Error('GITHUB_CLIENT_ID not set');

  if (!env.GITHUB_CLIENT_SECRET)
    throw new Error('GITHUB_CLIENT_SECRET not set');

  const oauth2 = simple_oauth2.create({
    client: {
      id: env.GITHUB_CLIENT_ID,
      secret: env.GITHUB_CLIENT_SECRET,
    },
    auth: {
      tokenHost: 'https://github.com',
      authorizePath: '/login/oauth/authorize',
      tokenPath: '/login/oauth/access_token',
    },
  });

  const LOGIN_ROUTE = baseRoute + '/login';
  const CALLBACK_ROUTE = baseRoute + '/login/callback';
  const LOGOUT_ROUTE = baseRoute + '/logout';
  if (!scope)
    scope = '';


  function isLoggedIn(session) {
    return typeof session === 'object' &&
      typeof session.token === 'string';
  }


  function formatRedirectUri(ctx) {
    return url.format({
      protocol: ctx.protocol,
      slashes: true,
      host: ctx.host,
      pathname: CALLBACK_ROUTE,
      query: ctx.query.redirect ? { redirect: ctx.query.redirect } : null,
    });
  }


  function getFinalRedirect(ctx) {
    if (!ctx.query.redirect)
      return '/';
    const comp = url.parse(ctx.query.redirect);
    if (comp.protocol || comp.host)
      throw new Error('Invalid redirect');
    return comp.path;
  }


  const loginRoute = route.get(LOGIN_ROUTE, function* () {
    const authorizationUri = oauth2.authorizationCode.authorizeURL({
      scope: scope,
      redirect_uri: formatRedirectUri(this),
    });
    this.redirect(authorizationUri);
  });


  const callbackRoute = route.get(CALLBACK_ROUTE, function* () {
    const token = yield oauth2.authorizationCode.getToken({
      code: this.query.code,
      redirect_uri: formatRedirectUri(this),
    });
    if (!token.access_token)
      throw new Error(token.error_description || 'Unknown error');
    this.session.token = token.access_token;
    // Get the authenticated user
    const ghUserApi = github.makeGhApi(this.session.token);
    const userInfo = yield github.getUserInfo(ghUserApi);

    // Get proper redirect
    this.redirect(getFinalRedirect(this));
  });


  const logoutRoute = route.get(LOGOUT_ROUTE, function* () {
    this.session = null;
    yield this.render('auth/logout');
  });


  const middleware = function* (next) {
    if (!isLoggedIn(this.session)) {
      // Make login redirect path
      return this.redirect(LOGIN_ROUTE + '?redirect=' + qs.escape(this.path + this.search));
    }
    this.ghUserApi = github.makeGhApi(this.session.token);
    this.state.userInfo = yield github.getUserInfo(this.ghUserApi);
    yield next;
  };


  return compose([loginRoute, callbackRoute, logoutRoute, middleware]);
};

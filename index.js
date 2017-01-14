'use strict';
const path = require('path');
const koa = require('koa');
const koa_session = require('koa-session');
const koa_logger = require('koa-logger');
const koa_ejs = require('koa-ejs');
const koa_sslify = require('koa-sslify');

const controller_error = require('./controller/error');
const controller_purecss = require('./controller/purecss');
const controller_auth = require('./controller/auth');
const controller_pull = require('./controller/pull');


function getLocalConfig() {
  try {
    require.resolve('./localConfig');
  } catch (e) {
    return {};
  }
  return require('./localConfig');
}


function makeApp(env) {
  const app = koa();

  if (!env.KOA_KEYS)
    throw new Error('KOA_KEYS not set');

  app.keys = env.KOA_KEYS.split(/\s+/);
  app.proxy = !!env.KOA_PROXY;

  // Base
  app.use(koa_logger());
  app.use(controller_error(env));
  if (env.KOA_REQUIRE_HTTPS) {
    app.use(koa_sslify({
      trustProtoHeader: !!env.KOA_PROXY,
    }));
  }

  // Static content
  app.use(controller_purecss(env, '/purecss'));

  // Dynamic content
  app.use(koa_session(app));
  koa_ejs(app, {
    root: path.join(__dirname, 'view'),
    layout: 'template',
    cache: true,
    viewExt: '.html',
    debug: false,
  });
  app.use(controller_auth(env, '/auth'));
  app.use(controller_pull(env, ''));

  return app;
}
module.exports = makeApp;


if (require.main === module) {
  const env = Object.assign({}, getLocalConfig(), process.env);
  makeApp(env).listen(env.PORT || 5000);
}

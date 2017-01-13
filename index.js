'use strict';
const path = require('path');
const koa = require('koa');

function hasLocalConfig() {
  try {
    require.resolve('./localConfig');
    return true;
  } catch (e) {
    return false;
  }
}
if (hasLocalConfig())
  Object.assign(process.env, require('./localConfig'));



const app = koa();

if (!process.env.KOA_KEYS)
  throw new Error('KOA_KEYS not set');

app.keys = process.env.KOA_KEYS.split(/\s+/);
app.proxy = !!process.env.KOA_PROXY;

app.use(require('koa-logger')());
app.use(require('./controller/error')());
if (process.env.KOA_REQUIRE_HTTPS) {
  app.use(require('koa-sslify')({
    trustProtoHeader: !!process.env.KOA_PROXY,
  }));
}
app.use(require('./controller/purecss')('/purecss'));
app.use(require('koa-session')(app));
require('koa-ejs')(app, {
  root: path.join(__dirname, 'view'),
  layout: 'template',
  cache: true,
  viewExt: '.html',
  debug: false,
});
app.use(require('./controller/auth')('/auth'));
app.use(require('./controller/pull')(''));

app.listen(process.env.PORT || 5000);

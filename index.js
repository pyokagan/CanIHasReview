'use strict';

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


const path = require('path');
const co = require('co');
const koa = require('koa');
const route = require('koa-route');
const gh = require('./lib/github');

const app = koa();

if (!process.env.KOA_KEYS)
  throw new Error('KOA_KEYS not set');

app.keys = process.env.KOA_KEYS.split(/\s+/);
app.proxy = !!process.env.KOA_PROXY;

app.use(require('koa-logger')());
app.use(require('./controller/fatal-error')());
if (process.env.KOA_REQUIRE_HTTPS) {
  app.use(require('koa-sslify')({
    trustProtoHeader: !!process.env.KOA_PROXY,
  }));
}
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

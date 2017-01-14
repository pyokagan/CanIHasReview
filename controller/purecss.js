'use strict';
const route = require('koa-route');
const fs = require('fs');
const purecss = require('purecss');


module.exports = function(env, baseRoute) {
  if (!baseRoute)
    baseRoute = '';

  const cache = {};

  function getFile(name) {
    return new Promise(function(resolve, reject) {
      if (cache[name])
        return resolve(cache[name]);

      fs.readFile(purecss.getFilePath(name), 'utf-8', function(err, data) {
        if (err)
          return reject(err);

        cache[name] = data;
        resolve(data);
      });
    });
  }

  return route.get(baseRoute + '/:name', function* (name) {
    if (!name.endsWith('.css') || name.indexOf('/') >= 0 || name.indexOf('\\') >= 0)
      this.throw(404);

    try {
      this.body = yield getFile(name);
      this.type = 'text/css';
    } catch (err) {
      if (err.code === 'ENOENT')
        this.throw(404);
      throw err;
    }
  });

};

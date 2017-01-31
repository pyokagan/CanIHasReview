'use strict';
const url = require('url');
const co = require('co');
const BASE_URL = require('./api').BASE_URL;


/**
 * Parses
 *     <https://api.github.com/a>; rel="next", <https://api.github.com/b>; rel="last"
 */
function parseLinks(link) {
  const links = {};

  link.replace(/<([^>]*)>;\s*rel="([\w]*)\"/g, function(m, uri, type) {
    links[type] = uri;
  });

  return links;
}


function* forEachPage(ghApi, opts, fn) {
  var fullOpts = Object.assign({}, opts, { resolveWithFullResponse: true });

  while (true) {
    const resp = yield ghApi(fullOpts);

    const fnRet = fn(resp.body);
    if (fnRet)
      yield fnRet;

    if (!resp.headers['link'])
      return;

    const links = parseLinks(resp.headers['link']);
    if (!links.next)
      return;

    if (!links.next.startsWith(BASE_URL))
      throw new Error('invalid next page url ' + links.next);

    const nextUri = url.parse(links.next).path;
    Object.assign(fullOpts, {
      method: 'GET',
      url: nextUri,
    });
  }
}
exports.forEachPage = co.wrap(forEachPage);

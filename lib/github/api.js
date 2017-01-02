'use strict';
const request = require('request-promise-native');


function makeGhApi(token) {
  const headers = {};
  headers['User-Agent'] = 'request';
  if (token)
    headers['Authorization'] = 'token ' + token;
  return request.defaults({
    baseUrl: 'https://api.github.com/',
    json: true,
    headers: headers,
  });
}
exports.makeGhApi = makeGhApi;

'use strict';
const request = require('request-promise-native');


const BASE_URL = 'https://api.github.com';
exports.BASE_URL = BASE_URL;


function makeGhApi(token) {
  const headers = {};
  headers['User-Agent'] = 'request';
  if (token)
    headers['Authorization'] = 'token ' + token;
  return request.defaults({
    baseUrl: BASE_URL,
    json: true,
    headers: headers,
  });
}
exports.makeGhApi = makeGhApi;

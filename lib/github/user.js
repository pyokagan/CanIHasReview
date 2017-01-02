'use strict';
const co = require('co');


/**
 * Returns user info.
 */
function* getUserInfo(ghUserApi) {
  return yield ghUserApi.get('/user');
}
exports.getUserInfo = co.wrap(getUserInfo);

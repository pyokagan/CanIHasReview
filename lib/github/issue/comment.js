'use strict';
const co = require('co');


/**
 * Post a comment on an issue or pull request.
 */
function* postComment(ghUserApi, issueInfo, body) {
  var url = '/repos/' + issueInfo.base.owner + '/' + issueInfo.base.repo + '/issues/' + issueInfo.number + '/comments';
  yield ghUserApi.post(url, {
    json: {
      body: body
    },
  });
}
exports.postComment = co.wrap(postComment);

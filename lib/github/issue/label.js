'use strict';
const co = require('co');


function* setIssueLabels(ghUserApi, owner, repo, number, labels) {
  if (!Array.isArray(labels))
    throw new TypeError('labels must be an array');
  const url = `/repos/${owner}/${repo}/issues/${number}/labels`;
  yield ghUserApi.put(url, { json: labels });
}
exports.setIssueLabels = co.wrap(setIssueLabels);

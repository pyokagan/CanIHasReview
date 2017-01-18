'use strict';
const co = require('co');
const mungeCommit = require('./munge').mungeCommit;


/**
 * Get branch info
 */
function* getBranchInfo(ghApi, owner, repo, name) {
  const branchInfo = yield ghApi.get('/repos/' + owner + '/' + repo + '/branches/' + name);
  return {
    name: branchInfo.name,
    head: {
      sha: branchInfo.commit.sha,
      owner: owner,
      repo: repo,
    },
  };
}
exports.getBranchInfo = co.wrap(getBranchInfo);

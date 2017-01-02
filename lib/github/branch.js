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


function* getBranchCommits(ghApi, owner, repo, name) {
  const branchCommits = yield ghApi.get('/repos/' + owner + '/' + repo + '/commits', {
    qs: { sha: branchInfo.commit.sha, per_page: 100 },
  });
  return branchCommits.map(mungeCommit);
}
exports.getBranchCommits = co.wrap(getBranchCommits);

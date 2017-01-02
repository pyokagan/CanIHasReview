'use strict';
const co = require('co');
const mungeCommit = require('./munge').mungeCommit;


/**
 * Returns PR info.
 */
function* getPrInfo(ghApi, owner, repo, pr) {
  const prInfo = yield ghApi.get('/repos/' + owner + '/' + repo + '/pulls/' + pr);
  return {
    number: prInfo.number,
    title: prInfo.title,
    body: prInfo.body,
    state: prInfo.state,
    user: { id: prInfo.user.id, login: prInfo.user.login },
    head: {
      sha: prInfo.head.sha,
      owner: prInfo.head.repo.owner.login,
      repo: prInfo.head.repo.name,
    },
    base: {
      sha: prInfo.base.sha,
      owner: prInfo.base.repo.owner.login,
      repo: prInfo.base.repo.name,
    },
  };
}
exports.getPrInfo = co.wrap(getPrInfo);


function* getPrCommits(ghApi, owner, repo, pr) {
  const prCommits = yield ghApi.get('/repos/' + owner + '/' + repo + '/pulls/' + pr + '/commits');
  return prCommits.map(mungeCommit);
}
exports.getPrCommits = co.wrap(getPrCommits);

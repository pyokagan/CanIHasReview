'use strict';
const co = require('co');
const mungeCommit = require('./munge').mungeCommit;
const forEachPage = require('./pagination').forEachPage;


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


function forEachPrCommit(ghApi, owner, repo, pr, fn) {
  const url = `/repos/${owner}/${repo}/pulls/${pr}/commits`;
  return forEachPage(ghApi, {
    url: url,
    qs: { per_page: 100 }
  }, co.wrap(function* (pageCommits) {
    pageCommits = pageCommits.map(mungeCommit);
    for (var i = 0; i < pageCommits.length; i++) {
      const ret = fn(pageCommits[i]);

      if (ret)
        yield ret;
    }
  }));
}
exports.forEachPrCommit = forEachPrCommit;


function getPrCommits(ghApi, owner, repo, pr) {
  const prCommits = [];
  return forEachPrCommit(ghApi, owner, repo, pr, function(prCommit) {
    prCommits.push(prCommit);
  }).then(function() {
    return prCommits;
  });
}
exports.getPrCommits = getPrCommits;

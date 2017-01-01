'use strict';
const co = require('co');
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


/**
 * Returns the subject (first line) of a commit message.
 */
function getCommitSubject(message) {
  const idx = message.indexOf('\n\n');
  return (idx >= 0 ? message.slice(0, idx) : message).replace(/\n/, ' ');
}


/**
 * Returns the body of a commit message.
 */
function getCommitBody(message) {
  const idx = message.indexOf('\n\n');
  return idx >= 0 ? message.slice(idx + 2) : '';
}


function mungeCommit(commit) {
  return {
    sha: commit.sha,
    tree: commit.commit.tree.sha,
    message: commit.commit.message,
    subject: getCommitSubject(commit.commit.message),
    body: getCommitBody(commit.commit.message),
  };
}


/**
 * Returns user info.
 */
function* getUserInfo(ghUserApi) {
  return yield ghUserApi.get('/user');
}
exports.getUserInfo = co.wrap(getUserInfo);


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

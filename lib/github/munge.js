'use strict';


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
    parents: commit.parents.map(function(x) { return x.sha; }),
  };
}
exports.mungeCommit = mungeCommit;


function mungeUser(user) {
  return {
    login: user.login,
    id: user.id,
    avatarUrl: user.avatar_url,
    type: user.type,
  };
}
exports.mungeUser = mungeUser;

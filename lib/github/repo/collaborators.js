'use strict';
const co = require('co');
const forEachPage = require('../pagination').forEachPage;
const mungeUser = require('../munge').mungeUser;


function mungeCollaborator(collaborator) {
  return Object.assign(mungeUser(collaborator), {
    permissions: collaborator.permissions,
  });
}


function forEachRepoCollaborator(ghUserApi, owner, repo, fn) {
  const url = `/repos/${owner}/${repo}/collaborators`;
  return forEachPage(ghUserApi, {
    url: url,
  }, co.wrap(function* (pageCollaborators) {
    pageCollaborators = pageCollaborators.map(mungeCollaborator);
    for (const pageCollaborator of pageCollaborators) {
      const ret = fn(pageCollaborator);
      if (ret)
        yield ret;
    }
  }));
}
exports.forEachRepoCollaborator = forEachRepoCollaborator;


function getRepoCollaborators(ghUserApi, owner, repo) {
  const collaborators = [];
  return forEachRepoCollaborator(ghUserApi, owner, repo, function(collaborator) {
    collaborators.push(collaborator);
  }).then(function() {
    return collaborators;
  });
}
exports.getRepoCollaborators = getRepoCollaborators;

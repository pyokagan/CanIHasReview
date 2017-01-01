'use strict';


function getRepoConfig(cfg, owner, repo) {
  if (!cfg || !cfg.repos)
    return;
  const ownerConfig = cfg.repos[owner];
  const repoConfig = cfg.repos[owner + '/' + repo];
  if (!ownerConfig && !repoConfig)
    return;
  return Object.assign({}, ownerConfig || {}, repoConfig || {});
}
exports.getRepoConfig = getRepoConfig;

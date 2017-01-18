'use strict';
const route = require('koa-route');
const compose = require('koa-compose');
const co = require('co');
const gh = require('../lib/github');
const prstore = require('../lib/prstore');
const bg = require('../lib/bg');
const tmp = require('tmp-promise');
const shell = require('../lib/shell');
const configLib = require('../lib/config');
const config = require('../config');


function formatComment(prInfo, prCommits, version, interdiffSha) {
  const vVersion = 'v' + version;
  const out = [];
  out.push('# ' + vVersion);
  out.push('');

  out.push(`@${prInfo.user.login} submitted ${vVersion} for review.`);
  out.push('');

  // Commit List
  for (var i = 0; i < prCommits.length; i++) {
    const nr = vVersion + ' ' + (i + 1) + '/' + prCommits.length;
    const subject = prCommits[i].subject;
    const url = 'https://github.com/' + prInfo.base.owner + '/' + prInfo.base.repo + '/pull/' + prInfo.number + '/commits/' + prCommits[i].sha;
    out.push(`* [${nr}] [${subject}](${url})`);
  }
  out.push('');

  const miniBar = [];

  // Minibar: Archive
  const archiveUrl = 'https://github.com/' + prInfo.base.owner + '/' + prInfo.base.repo + '/compare/' + prInfo.base.sha + '...' + prInfo.head.sha;
  miniBar.push('([:books: Archive](' + archiveUrl + '))');

  // Minibar: Interdiff
  if (interdiffSha) {
    const interdiffUrl = 'https://github.com/' + prInfo.base.owner + '/' + prInfo.base.repo + '/commit/' + interdiffSha;
    miniBar.push('([:chart_with_upwards_trend: Interdiff between v' + (version - 1) + ' and v' + version + '](' + interdiffUrl + '))');
  }

  out.push(miniBar.join(' '));

  // Help
  out.push('<details>');
  out.push('<summary>Checkout this PR version locally</summary>');
  out.push('');
  out.push('```shell');
  out.push('git fetch https://github.com/' + prInfo.base.owner + '/' + prInfo.base.repo + '.git refs/pr/' + prInfo.number + '/' + version + '/head:BRANCHNAME');
  out.push('```');
  out.push('where `BRANCHNAME` is the name of the local branch you want to fetch this PR to.');
  out.push('');
  out.push('</details>');

  return out.join('\n');
}


const MAX_COMMITS = 50;
function getPrCommits(ghApi, owner, repo, pr) {
  const prCommits = [];
  return gh.forEachPrCommit(ghApi, owner, repo, pr, function (prCommit) {
    if (prCommits.length >= MAX_COMMITS)
      throw new Error('PR has too many commits. '
                      + 'PRs can only have a maximum of ' + MAX_COMMITS + ' commits');
    prCommits.push(prCommit);
  }).then(function() {
    return prCommits;
  });
}


function checkForMergeCommits(prCommits) {
  var hasMergeCommit = false;
  prCommits.forEach(function(prCommit) {
    if (prCommit.parents.length != 1) {
      prCommit.failedChecks = prCommit.failedChecks || [];
      prCommit.failedChecks.push('Merge commit');
      hasMergeCommit = true;
    }
  });
  return hasMergeCommit ? ['Has merge commit'] : [];
}


function runPrChecks(prCommits) {
  const failedChecks = [];

  failedChecks.push.apply(failedChecks, checkForMergeCommits(prCommits));

  return failedChecks;
}


module.exports = function(env, baseRoute) {
  if (!baseRoute)
    baseRoute = '';

  if (!env.GITHUB_TOKEN)
    throw new Error('GITHUB_TOKEN not set');

  const BOT_TOKEN = env.GITHUB_TOKEN;
  const BASE_ROUTE = baseRoute + '/:owner/:repo/pull/:pr';
  const jobs = bg();


  const getRoute = route.get(BASE_ROUTE, function* (owner, repo, pr) {
    // We must support the repo
    if (!configLib.getRepoConfig(config, owner, repo))
      throw new Error('Unsupported repo');

    const prInfo = yield gh.getPrInfo(this.ghUserApi, owner, repo, pr);
    const prCommits = yield gh.getPrCommits(this.ghUserApi, owner, repo, pr);

    // Run PR checks
    const failedChecks = runPrChecks(prCommits);

    yield this.render('pull/get', {
      title: prInfo.title,
      prInfo: prInfo,
      prCommits: prCommits,
      failedChecks: failedChecks,
    });
  });


  const postRoute = route.post(BASE_ROUTE, function* (owner, repo, pr) {
    // We must support the repo
    if (!configLib.getRepoConfig(config, owner, repo))
      throw new Error('Unsupported repo');

    const prInfo = yield gh.getPrInfo(this.ghUserApi, owner, repo, pr);

    // User must have submitted the PR
    if (!this.state.userInfo || this.state.userInfo.id != prInfo.user.id)
      throw new Error('User does not own the PR');

    // Get PR commits
    const prCommits = yield getPrCommits(this.ghUserApi, owner, repo, pr);

    // Run PR checks
    const failedChecks = runPrChecks(prCommits);
    if (failedChecks.length)
      throw new Error('PR checks failed: ' + JSON.stringify(failedChecks));

    const jobName = JSON.stringify([prInfo.base.owner, prInfo.base.repo, prInfo.number]);
    if (jobs.has(jobName))
      throw new Error('Already have job running');
    jobs.run(jobName, co(runPostRoute(prInfo)));

    yield this.render('pull/new-revision-success', {
      title: prInfo.title + ' - new iteration submitted',
      prInfo: prInfo,
    });
  });


  function *runPostRoute(prInfo) {
    const repoConfig = configLib.getRepoConfig(config, prInfo.base.owner, prInfo.base.repo);
    if (!repoConfig)
      throw new Error('Unsupported base repo');

    const tmpDir = yield tmp.dir({ unsafeCleanup: true });

    const myShell = shell.defaults({
      cwd: tmpDir.path,
    });

    var prCommits, nextVersion, shas;
    try {
      yield prstore.initWorkRepo(myShell,
        'https://' + BOT_TOKEN + '@github.com/' + prInfo.base.owner + '/' + prInfo.base.repo + '.git');

      yield prstore.fetchPr(myShell, prInfo.number);

      nextVersion = (yield prstore.getVersions(myShell, prInfo.number)).length;
      if (!nextVersion)
        nextVersion = 1;

      shas = yield prstore.makeVersion(myShell, prInfo.number, nextVersion, prInfo.base.sha, prInfo.head.sha);

      yield prstore.pushVersions(myShell, prInfo.number, [nextVersion]);

      prCommits = yield prstore.getVersionCommits(myShell, prInfo.number, nextVersion);
    } finally {
      tmpDir.cleanup();
    }

    // Post comment
    const ghBotApi = gh.makeGhApi(BOT_TOKEN);
    const commentBody = formatComment(prInfo, prCommits, nextVersion, shas.interdiff);
    yield gh.postComment(ghBotApi, prInfo, commentBody);

    // Set labels (if needed)
    if (repoConfig.readyForReviewLabels)
      yield gh.setIssueLabels(ghBotApi, prInfo.base.owner, prInfo.base.repo,
                              prInfo.number, repoConfig.readyForReviewLabels);
  }

  return compose([getRoute, postRoute]);
}

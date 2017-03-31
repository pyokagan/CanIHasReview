'use strict';
/**
 * Storage of PR versions and interdiffs.
 */
const co = require('co');
const git = require('./git');


const forcePick = co.wrap(function* forceCommit(workShell, sha) {
  yield workShell.checkCall('git', ['read-tree', '--reset', '-u', sha]);
  yield workShell.checkCall('git', ['commit', '--allow-empty', '-C', sha]);
});


const forceCherryPick = co.wrap(function* forceCherryPick(workShell, sha) {
  var cmd = ['cherry-pick', '-X', 'theirs', sha];
  var statuses;

  while (true) {
    try {
      yield workShell.checkCall('git', cmd);
      return;
    } catch (e) {
      statuses = yield git.status(workShell);
      if (!statuses)
        throw e; // No conflicts, likely some other error
    }

    // Resolve conflicts
    for (const conflict of statuses) {
      switch (conflict.xy) {
        case 'M ':
        case 'A ':
        case 'R ':
        case 'C ': // index and work tree matches
          break; // do nothing
        case 'UD': // unmerged, deleted by them
          yield workShell.checkCall('git', ['rm', conflict.path]);
          break;
        default:
          throw new Error('Unknown conflict status ' + conflict.xy);
      }
    }

    yield workShell.checkCall('git', ['commit', '--no-edit']);

    cmd = ['cherry-pick', '--continue'];
  }
});


/**
 * Initializes a cache repo.
 * Shell must be inside the directory where you want the cache to be.
 * (Note: originUrl must contain the oauth2 token)
 */
function* initCacheRepo(shell, originUrl) {
  yield shell.checkCall('git', ['init', '--bare']);
  yield shell.checkCall('git', ['remote', 'add', 'origin', originUrl]);
  yield shell.checkCall('git', ['fetch', 'origin',
    '+refs/heads/*:refs/heads/*', // Fetch branches (to speed up subsequent downloading of PRs)
    '+refs/pr/*:refs/pr/*' // Fetch PR store refs (so we know how many versions each PR has)
  ]);
}
exports.initCacheRepo = co.wrap(initCacheRepo);


/**
 * Initializes a work repo.
 * Shell must be inside the directory where you want the work repo to be (usually a temp dir).
 */
function* initWorkRepo(shell, originUrl, cacheUrl) {
  yield shell.checkCall('git', ['init']);
  yield shell.checkCall('git', ['config', 'user.name', 'CanI HasReview']);
  yield shell.checkCall('git', ['config', 'user.email', 'pyokagan+canihasreview@gmail.com']);
  yield shell.checkCall('git', ['remote', 'add', 'origin', originUrl]);
  if (cacheUrl)
    yield shell.checkCall('git', ['remote', 'add', 'cache', cacheUrl]);
  yield shell.checkCall('git', ['fetch', cacheUrl ? 'cache' : 'origin',
    '+refs/heads/*:refs/remotes/origin/*',
    '+refs/pr/*:refs/pr/*']);
}
exports.initWorkRepo = co.wrap(initWorkRepo);


/**
 * Returns stored PR versions.
 * [{ base: SHA1, head: SHA1, interdiff: SHA1 }, ...]
 */
function* getVersions(shell, prNumber) {
  // refs/pr/NUMBER/VERSION/{head, interdiff}
  const refNames = (yield shell.checkOutput('git', ['for-each-ref', '--format', '%(refname)/%(objectname)', 'refs/pr/' + prNumber + '/*/*'])).trim();
  const out = [];
  if (!refNames.length)
    return out;
  for (const refName of refNames.split('\n')) {
    const components = refName.split('/');
    const versionNumber = parseInt(components[3]);
    out[versionNumber] = out[versionNumber] || {};
    out[versionNumber][components[4]] = components[5];
  }
  return out;
}
exports.getVersions = co.wrap(getVersions);


/**
 * Returns version info.
 * { base: SHA1, head: SHA1, interdiff: SHA1 }
 */
function* getVersion(shell, prNumber, version) {
  const refNames = (yield shell.checkOutput('git', ['for-each-ref', '--format', '%(refname)/%(objectname)', 'refs/pr/' + prNumber + '/' + version + '/*'])).trim();
  if (!refNames.length)
    return null;
  const out = {};
  for (const refName of refNames.split('\n')) {
    const components = refName.split('/');
    out[components[4]] = components[5];
  }
  return out;
}
exports.getVersion = co.wrap(getVersion);


/**
 * Returns list of commits for a version.
 */
function getVersionCommits(shell, prNumber, version) {
  return git.log(shell, ['--reverse', `pr/${prNumber}/${version}/base..pr/${prNumber}/${version}/head`]);
}
exports.getVersionCommits = getVersionCommits;


function setVersionSha(shell, prNumber, version, name, sha) {
  return shell.checkCall('git', ['update-ref',
    'refs/pr/' + prNumber + '/' + version + '/' + name,
    sha]);
}
exports.setVersionSha = setVersionSha;


function setVersionBase(shell, prNumber, version, sha) {
  return setVersionSha(shell, prNumber, version, 'base', sha);
}
exports.setVersionBase = setVersionBase;


function setVersionHead(shell, prNumber, version, sha) {
  return setVersionSha(shell, prNumber, version, 'head', sha);
}
exports.setVersionHead = setVersionHead;


function setVersionInterdiff(shell, prNumber, version, sha) {
  return setVersionSha(shell, prNumber, version, 'interdiff', sha);
}
exports.setVersionInterdiff = setVersionInterdiff;


/**
 * Fetch PR.
 */
function* fetchPr(workShell, prNumber) {
  yield workShell.checkCall('git', ['fetch', 'origin', 'pull/' + prNumber + '/head']);
  return (yield workShell.checkOutput('git', ['rev-parse', 'FETCH_HEAD']));
}
exports.fetchPr = co.wrap(fetchPr);


/**
 * "Makes" a version.
 */
function* makeVersion(workShell, prNumber, version, base, head) {
  const out = {
    base: base,
    head: head
  };

  yield setVersionBase(workShell, prNumber, version, base);
  yield setVersionHead(workShell, prNumber, version, head);

  // Generate interdiff
  const prevVersion = yield getVersion(workShell, prNumber, version - 1);
  if (prevVersion && prevVersion.head && prevVersion.base) {
    yield workShell.checkCall('git', ['checkout', base]);
    yield forceCherryPick(workShell, prevVersion.base + '..' + prevVersion.head);
    yield forcePick(workShell, head);
    yield workShell.checkCall('git', ['commit', '--amend', '--allow-empty', '-m', 'Interdiff between v' + (version - 1) + ' and v' + version]);
    out.interdiff = (yield workShell.checkOutput('git', ['rev-parse', 'HEAD'])).trim();
    yield setVersionInterdiff(workShell, prNumber, version, out.interdiff);
  }

  return out;
}
exports.makeVersion = co.wrap(makeVersion);


/**
 * Returns true if the remote exists.
 */
function* hasRemote(shell, remote) {
  return (yield shell.call('git', ['config', 'remote.' + remote + '.url'])) === 0;
}

/**
 * Push version(s)
 */
function* pushVersions(shell, prNumber, versions) {
  const pathspecs = Array.isArray(versions) ? versions.map(function(x) {
    return '+refs/pr/' + prNumber + '/' + x + '/*:refs/pr/' + prNumber + '/' + x + '/*';
  }) : ['+refs/pr/' + prNumber + '/*:refs/pr/' + prNumber + '/*'];
  const cmd = ['push', '-f', 'origin'];
  cmd.push.apply(cmd, pathspecs);

  yield shell.checkCall('git', cmd);

  const hasCache = yield* hasRemote(shell, 'cache');
  if (hasCache) {
    cmd[2] = 'cache';
    yield shell.checkCall('git', cmd);
  }
}
exports.pushVersions = co.wrap(pushVersions);

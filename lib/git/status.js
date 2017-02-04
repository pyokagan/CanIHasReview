'use strict';
const co = require('co');


/**
 * Split text into lines.
 */
function splitLines(text) {
  const lines = text.split('\n');
  if (text[text.length - 1] === '\n')
    lines.length--;
  return lines;
}


/**
 * Parses git-status porcelain output into statuses
 */
function parseLines(lines) {
  const statuses = [];
  for (const line of lines) {
    // TODO: Handle quoted paths
    // TODO: Handle PATH1 -> PATH2
    const result = /^(..) (.+)$/.exec(line);
    if (!result)
      continue; // skip line
    statuses.push({
      xy: result[1],
      path: result[2],
    });
  }
  return statuses;
}


module.exports = co.wrap(function* (shell, args) {
  if (!args)
    args = [];
  if (typeof args === 'string')
    args = [args];
  const statusArgs = ['status', '--porcelain'];
  statusArgs.push.apply(statusArgs, args);
  const output = yield shell.checkOutput('git', statusArgs);
  return parseLines(splitLines(output));
});

'use strict';
/**
 * Runs git log and returns its output in JSON format.
 */
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
 * Returns the subject (first line) of a commit message.
 */
function getSubject(message) {
  const idx = message.indexOf('\n\n');
  return (idx >= 0 ? message.slice(0, idx) : message).replace(/\n/, ' ');
}


/**
 * Returns the body of a commit message.
 */
function getBody(message) {
  const idx = message.indexOf('\n\n');
  return idx >= 0 ? message.slice(idx + 2) : '';
}


/**
 * Parse git-log raw lines into commits
 */
function parseLines(lines) {
  var state = 0, commit, messageLines;
  const commits = [];
  for (const line of lines) {
    switch (state) {
      case 0:
        commit = { parents: [] };
        messageLines = [];
        state++;
        // Fall-through
      case 1: { // look for commit line, ignore everything else
        if (line.startsWith('commit ')) {
          commit.sha = line.substring('commit '.length);
          state++;
        }
      } break;
      case 2: { // handle commit header
        // Empty line signals end of header
        if (!line.length) {
          state++;
          break;
        }

        const spaceIdx = line.indexOf(' ');
        const key = line.slice(0, spaceIdx >= 0 ? spaceIdx : line.length);
        const value = line.slice(spaceIdx >= 0 ? spaceIdx + 1 : line.length);

        if (key === 'parent')
          commit.parents.push(value);
        else
          commit[key] = value;

      } break;
      case 3: { // handle commit message
        // Empty line signal end of commit message
        if (!line.length) {
          commit.message = messageLines.join('\n') + '\n';
          commit.subject = getSubject(commit.message);
          commit.body = getBody(commit.message);
          commits.push(commit);
          state = 0;
          break;
        }

        messageLines.push(line.slice(4));
      } break;
      default:
        throw new Error('invalid state ' + state);
    }
  }

  if (state >= 3) {
    commit.message = messageLines.join('\n') + '\n';
    commit.subject = getSubject(commit.message);
    commit.body = getBody(commit.message);
    commits.push(commit);
  }

  return commits;
}


module.exports = co.wrap(function* (shell, args) {
  if (!args)
    args = [];
  if (typeof args === 'string')
    args = [args];
  const logArgs = ['log', '--format=raw'];
  logArgs.push.apply(logArgs, args);
  const output = yield shell.checkOutput('git', logArgs);
  return parseLines(splitLines(output));
});

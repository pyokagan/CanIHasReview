'use strict';
/**
 * "Shell scripting" utilities
 */
const child_process = require('child_process');

const factory = function(defaultOpts) {

  if (!defaultOpts)
    defaultOpts = {};

  const DEFAULT_STDIN = defaultOpts.stdin || 'inherit';
  const DEFAULT_STDOUT = defaultOpts.stdout || 'inherit';
  const DEFAULT_STDERR = defaultOpts.stderr || 'inherit';
  const exports = {};


  function defaults(newOpts) {
    return factory(Object.assign({}, defaultOpts, newOpts));
  }
  exports.defaults = defaults;


  function call(command, args, options) {
    return new Promise(function(resolve, reject) {
      const opts = Object.assign({}, defaultOpts, options);
      opts.stdio = opts.stdio || [ DEFAULT_STDIN, DEFAULT_STDOUT, DEFAULT_STDERR ];
      const cp = child_process.spawn(command, args, opts);
      cp.on('error', function(e) {
        reject(e);
      });
      cp.on('exit', function(code, signal) {
        resolve(code);
      });
    });
  }
  exports.call = call;


  function checkCall(command, args, options) {
    return new Promise(function(resolve, reject) {
      const opts = Object.assign({}, defaultOpts, options);
      opts.stdio = opts.stdio || [ DEFAULT_STDIN, DEFAULT_STDOUT, DEFAULT_STDERR ];
      const cp = child_process.spawn(command, args, opts);
      cp.on('error', function(e) {
        reject(e);
      });
      cp.on('exit', function(code, signal) {
        if (code === 0)
          return resolve();
        var msg = 'Command failed: ' + command + ' ' + args.join(' ');
        reject(new Error(msg));
      });
    });
  }
  exports.checkCall = checkCall;


  function checkOutput(command, args, options) {
    return new Promise(function(resolve, reject) {
      const opts = Object.assign({}, defaultOpts, options);
      opts.stdio = opts.stdio || [ DEFAULT_STDIN, 'pipe', DEFAULT_STDERR ];
      const encoding = opts.encoding || 'utf-8';
      const cp = child_process.spawn(command, args, opts);
      const outBuf = [];
      cp.on('error', function(e) {
        reject(e);
      });
      cp.stdout.on('data', function(data) {
        outBuf.push(data.toString(encoding));
      });
      cp.on('exit', function(code, signal) {
        const output = outBuf.join('');
        if (code === 0)
          return resolve(output);
        var msg = 'Command failed: ' + command + ' ' + args.join(' ');
        var err = new Error(msg);
        err.stdout = output;
        reject(err);
      });
    });
  }
  exports.checkOutput = checkOutput;


  return exports;
};

module.exports = factory();

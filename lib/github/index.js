'use strict';

const api = require('./api');
exports.makeGhApi = api.makeGhApi;

const user = require('./user');
exports.getUserInfo = user.getUserInfo;

const branch = require('./branch');
exports.getBranchInfo = branch.getBranchInfo;
exports.getBranchCommits = branch.getBranchCommits;

const issue = require('./issue');
exports.postComment = issue.postComment;

const pr = require('./pr');
exports.getPrInfo = pr.getPrInfo;
exports.getPrCommits = pr.getPrCommits;

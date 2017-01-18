'use strict';

const api = require('./api');
exports.BASE_URL = api.BASE_URL;
exports.makeGhApi = api.makeGhApi;

const user = require('./user');
exports.getUserInfo = user.getUserInfo;

const branch = require('./branch');
exports.getBranchInfo = branch.getBranchInfo;
exports.getBranchCommits = branch.getBranchCommits;

const issue = require('./issue');
exports.postComment = issue.postComment;
exports.setIssueLabels = issue.setIssueLabels;

const pr = require('./pr');
exports.getPrInfo = pr.getPrInfo;
exports.forEachPrCommit = pr.forEachPrCommit;
exports.getPrCommits = pr.getPrCommits;

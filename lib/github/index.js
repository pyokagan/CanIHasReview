'use strict';

const api = require('./api');
exports.makeGhApi = api.makeGhApi;
exports.getUserInfo = api.getUserInfo;
exports.getPrInfo = api.getPrInfo;
exports.getPrCommits = api.getPrCommits;
exports.getBranchInfo = api.getBranchInfo;
exports.getBranchCommits = api.getBranchCommits;
exports.postComment = api.postComment;

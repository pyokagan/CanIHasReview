'use strict';

const comment = require('./comment');
exports.postComment = comment.postComment;

const label = require('./label');
exports.setIssueLabels = label.setIssueLabels;

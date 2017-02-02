'use strict';

const base = require('./base');
exports.getPrInfo = base.getPrInfo;
exports.forEachPrCommit = base.forEachPrCommit;
exports.getPrCommits = base.getPrCommits;

const reviews = require('./reviews');
exports.forEachPrReview = reviews.forEachPrReview;
exports.getPrReviews = reviews.getPrReviews;

const reviewRequests = require('./reviewRequests');
exports.createPrReviewRequest = reviewRequests.createPrReviewRequest;

'use strict';
const co = require('co');
const forEachPage = require('../pagination').forEachPage;
const mungeUser = require('../munge').mungeUser;

const ACCEPT_HEADER = 'application/vnd.github.black-cat-preview+json, application/json';


function mungeReview(review) {
  return {
    id: review.id,
    user: mungeUser(review.user),
    body: review.body,
    commitId: review.commit_id,
    state: review.state,
  };
}


function forEachPrReview(ghApi, owner, repo, pr, fn) {
  const url = `/repos/${owner}/${repo}/pulls/${pr}/reviews`;
  return forEachPage(ghApi, {
    url: url,
    qs: { per_page: 100 },
    headers: {
      'accept': ACCEPT_HEADER
    },
  }, co.wrap(function* (pageReviews) {
    pageReviews = pageReviews.map(mungeReview);
    for (const pageReview of pageReviews) {
      const ret = fn(pageReview);

      if (ret)
        yield ret;
    }
  }));
}
exports.forEachPrReview = forEachPrReview;


function getPrReviews(ghApi, owner, repo, pr) {
  const prReviews = [];
  return forEachPrReview(ghApi, owner, repo, pr, function(prReview) {
    prReviews.push(prReview);
  }).then(function() {
    return prReviews;
  });
}
exports.getPrReviews = getPrReviews;

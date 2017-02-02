'use strict';


const ACCEPT_HEADER = 'application/vnd.github.black-cat-preview+json, application/json';


function createPrReviewRequest(ghUserApi, owner, repo, pr, reviewers) {
  if (!Array.isArray(reviewers))
    throw new TypeError('reviewers must be an array');
  const url = `/repos/${owner}/${repo}/pulls/${pr}/requested_reviewers`;
  return ghUserApi.post(url, {
    json: {
      reviewers: reviewers,
    },
    headers: {
      'accept': ACCEPT_HEADER,
    },
  });
}
exports.createPrReviewRequest = createPrReviewRequest;

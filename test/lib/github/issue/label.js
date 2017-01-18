'use strict';
const github = require('../../../../lib/github');
const label = require('../../../../lib/github/issue/label');
const assert = require('assert');
const nock = require('nock');


describe('lib/github/issue/label#setIssueLabels', function() {
  beforeEach(function() {
    this.ghApi = github.makeGhApi();
    this.baseNock = nock(github.BASE_URL);
  });

  afterEach(function() {
    this.baseNock.isDone();
  });

  it('works', function* () {
    this.baseNock.put('/repos/bob/david/issues/4/labels', ['a', 'b'])
      .reply(200, [{
        id: 1,
        url: github.BASE_URL + '/repos/bob/david/labels/a',
        name: 'a',
        color: '000000',
        default: false,
      }, {
        id: 2,
        url: github.BASE_URL + '/repos/bob/david/labels/b',
        name: 'b',
        color: 'ffffff',
        default: false,
      }]);
    const ret = yield label.setIssueLabels(this.ghApi, 'bob', 'david', 4, ['a', 'b']);
    assert(!ret);
  });

  it('is exported', function() {
    assert.strictEqual(github.setIssueLabels, label.setIssueLabels);
  });
});

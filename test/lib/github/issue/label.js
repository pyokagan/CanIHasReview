'use strict';
const github = require('../../../../lib/github');
const assert = require('assert');
const nock = require('nock');


describe('lib/github/issue/label#setIssueLabels', function() {
  beforeEach(function() {
    this.ghApi = github.makeGhApi();
    this.baseNock = nock('https://api.github.com');
  });

  afterEach(function() {
    this.baseNock.isDone();
  });

  it('works', function* () {
    this.baseNock.put('/repos/bob/david/issues/4/labels', ['a', 'b'])
      .reply(200, [{
        id: 1,
        url: 'https://api.github.com/repos/bob/david/labels/a',
        name: 'a',
        color: '000000',
        default: false,
      }, {
        id: 2,
        url: 'https://api.github.com/repos/bob/david/labels/b',
        name: 'b',
        color: 'ffffff',
        default: false,
      }]);
    const ret = yield github.setIssueLabels(this.ghApi, 'bob', 'david', 4, ['a', 'b']);
    assert(!ret);
  });
});

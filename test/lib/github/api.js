'use strict';
const github = require('../../../lib/github');
const assert = require('assert');
const nock = require('nock');


describe('lib/github/api#makeGhApi', function() {
  const TEST_TOKEN = 'abcdefg123';

  beforeEach(function() {
    this.ghApi = github.makeGhApi(TEST_TOKEN);
    this.baseNock = nock('https://api.github.com', {
      reqheaders: {
        'User-Agent': 'request',
        'Authorization': 'token ' + TEST_TOKEN,
        'Accept': 'application/json',
      },
    });
  });

  afterEach(function() {
    this.baseNock.isDone();
  });

  it('get', function* () {
    const expectedReply = { hello: 'world' };
    const scope = this.baseNock
                  .get('/')
                  .reply(200, expectedReply);
    const actualReply = yield this.ghApi.get('');
    assert.deepEqual(actualReply, expectedReply);
  });
});

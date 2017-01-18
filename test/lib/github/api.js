'use strict';
const github = require('../../../lib/github');
const api = require('../../../lib/github/api');
const assert = require('assert');
const nock = require('nock');


describe('lib/github/api#BASE_URL', function() {
  it('has the correct value', function() {
    assert.strictEqual(api.BASE_URL, 'https://api.github.com');
  });

  it('is exported', function() {
    assert.strictEqual(github.BASE_URL, api.BASE_URL);
  });
});


describe('lib/github/api#makeGhApi', function() {
  const TEST_TOKEN = 'abcdefg123';

  beforeEach(function() {
    this.ghApi = api.makeGhApi(TEST_TOKEN);
    this.baseNock = nock(api.BASE_URL, {
      reqheaders: {
        'User-Agent': 'request',
        'Authorization': 'token ' + TEST_TOKEN,
        'Accept': 'application/json',
      },
    });
  });

  afterEach(function() {
    const nockDone = nock.isDone();
    nock.cleanAll();
    assert(nockDone, '!nock.isDone()');
  });

  it('get', function* () {
    const expectedReply = { hello: 'world' };
    const scope = this.baseNock
                  .get('/')
                  .reply(200, expectedReply);
    const actualReply = yield this.ghApi.get('');
    assert.deepEqual(actualReply, expectedReply);
  });

  it('is exported', function() {
    assert.strictEqual(github.makeGhApi, api.makeGhApi);
  });
});

'use strict';
const github = require('../../../lib/github');
const pagination = require('../../../lib/github/pagination');
const assert = require('assert');
const nock = require('nock');
const request = require('request-promise-native');
const isPromise = require('is-promise');


describe('lib/github/pagination#forEachPage', function() {

  beforeEach(function() {
    this.ghApi = request.defaults({ baseUrl: github.BASE_URL });
    this.baseNock = nock(github.BASE_URL);
  });

  afterEach(function() {
    const nockDone = nock.isDone();
    nock.cleanAll();
    assert(nockDone, '!nock.isDone()');
  });

  it('goes to next page if provided', function* () {
    const expectedReply1 = 'Hello World';
    const expectedReply2 = 'Goodbye World!';
    const scope = this.baseNock
                  .get('/a')
                  .reply(200, expectedReply1, {
                    'link': '<' + github.BASE_URL + '/b?page=2>; rel="next", '
                            + '<' + github.BASE_URL + '/a>; rel="prev"'
                  })
                  .get('/b?page=2')
                  .reply(200, expectedReply2, {
                    'link': '<' + github.BASE_URL + '/a>; rel="prev"'
                  });
    var i = 0;
    const promise = pagination.forEachPage(this.ghApi, { url: '/a' }, function(body) {
      switch (i++) {
      case 0:
        assert.strictEqual(body, expectedReply1);
        break;
      case 1:
        assert.strictEqual(body, expectedReply2);
        break;
      default:
        assert.fail(null, null, 'callback called too many times');
      }
    });
    assert(isPromise(promise), 'promise not returned');
    const ret = yield promise;
    assert.strictEqual(ret, undefined);
  });

  it('resolves promises returned by the callback', function* () {
    const scope = this.baseNock
                  .get('/a')
                  .reply(200, '', {
                    'link': '<' + github.BASE_URL + '/b>; rel="next"'
                  })
                  .get('/b')
                  .reply(200);
    var i = 0, promiseResolved = false;
    yield pagination.forEachPage(this.ghApi, { url: '/a' }, function(body) {
      switch (i++) {
      case 0:
        return Promise.resolve().then(function() { promiseResolved = true; });
      case 1:
        break;
      default:
        assert.fail(null, null, 'callback called too many times');
      }
    });
    assert(promiseResolved, 'promise was not resolved');
  });

  it('throws error if next page url is not github', function* () {
    const scope = this.baseNock
                  .get('/a')
                  .reply(200, '', {
                    'link': '<https://badapi.github.com/b>; rel="next"'
                  });
    try {
      yield pagination.forEachPage(this.ghApi, { url: '/a' }, function() {});
    } catch (e) {
      assert.strictEqual(e.message, 'invalid next page url https://badapi.github.com/b');
      return;
    }
    assert.fail(null, null, 'exception not thrown');
  });

});

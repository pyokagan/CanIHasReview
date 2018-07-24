import assert from 'assert';
import fetchPonyfill from 'fetch-ponyfill';
import {
    suite,
    test,
} from 'mocha-typescript';
import nock from 'nock';
import {
    acceptHeader,
    baseUrl,
    createApi,
} from './api';
import {
    Fetch,
} from './fetch';

const { fetch } = fetchPonyfill();

/**
 * Tests for {@link createApi}
 */
@suite
export class CreateApiTest {
    private static userAgent = 'cihr-bot';
    private static token = 'abcdefg123';
    private ghApi: Fetch;
    private baseNock: nock.Scope;

    before(): void {
        this.ghApi = createApi({
            authorization: `token ${CreateApiTest.token}`,
            fetch,
            userAgent: CreateApiTest.userAgent,
        });
        this.baseNock = nock(baseUrl, {
            reqheaders: {
                'Accept': acceptHeader,
                'Authorization': `token ${CreateApiTest.token}`,
                'User-Agent': CreateApiTest.userAgent,
            },
        });
    }

    after(): void {
        const nockDone = nock.isDone();
        nock.cleanAll();
        assert(nockDone, '!nock.isDone()');
    }

    @test
    async 'get'(): Promise<void> {
        const expectedReply = { hello: 'world' };
        this.baseNock.get('/')
                    .reply(200, expectedReply);
        const actualReply = await this.ghApi('');
        assert.deepStrictEqual(await actualReply.json(), expectedReply);
    }
}

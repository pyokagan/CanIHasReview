import assert from 'assert';
import {
    suite,
    test,
} from 'mocha-typescript';
import {
    Route,
} from './route';

@suite('lib/http/route#Route')
export class RouteTest {
    @test
    'rejects routes not starting with /'(): void {
        assert.throws(() => new Route<{}>(''));
        assert.throws(() => new Route<{}>('abc'));
        assert.throws(() => new Route<{}>('abc/'));
    }

    @test
    'returns false/null if pathname does not match'(): void {
        const route = new Route<{}>('/a/b');
        assertNoMatch(route, '', '');
        assertNoMatch(route, '/a', '');
        assertNoMatch(route, '/a/b/c', '');
        assertNoMatch(route, '/a/b/', '');
    }

    @test
    'number of slashes are significant'(): void {
        const route = new Route<{}>('/a/b');
        assertMatch(route, '/a/b', '', {});
        assertNoMatch(route, '/a/b/', '');
        assertNoMatch(route, '/a/b//', '');
        assertNoMatch(route, '/a//b', '');

        const route2 = new Route<{}>('/a/b/');
        assertNoMatch(route2, '/a/b', '');
        assertMatch(route2, '/a/b/', '', {});
        assertNoMatch(route2, '/a/b//', '');
        assertNoMatch(route2, '/a//b/', '');
    }

    @test
    'routes are case-sensitive'(): void {
        const route = new Route<{}>('/a/b');
        assertMatch(route, '/a/b', '', {});
        assertNoMatch(route, '/A/b', '');
    }

    @test
    'parses "one-only" parameters correctly'(): void {
        type RouteData = {
            foo: string;
        };
        const route = new Route<RouteData>('/a/:foo');
        assertMatch(route, '/a/bar', '', {
            foo: 'bar',
        });
        assertMatch(route, '/a/bar', '?baz', {
            foo: 'bar',
        });
        assertMatch(route, '/a/%20', '', {
            foo: ' ',
        });
        assertNoMatch(route, '/a/bar/', '');
        assertNoMatch(route, '/a//bar', '');
        assertNoMatch(route, '/a/bar/baz', '');

        const route2 = new Route<RouteData>('/a/:foo/b');
        assertMatch(route2, '/a/bar/b', '', {
            foo: 'bar',
        });
        assertNoMatch(route2, '/a//b', '');
    }

    @test
    'parses "optional" parameters correctly'(): void {
        type RouteData = {
            foo?: string;
        };
        const route = new Route<RouteData>('/a/:foo?');
        assertMatch(route, '/a/bar', '', {
            foo: 'bar',
        });
        assertNoMatch(route, '/a/', '');
        assertMatch(route, '/a', '', {});
        assertNoMatch(route, '/a//', '');
    }

    @test
    'parses "zero or more" parameters correctly'(): void {
        type RouteData = {
            foo: string[];
        };
        const route = new Route<RouteData>('/a/:foo*');
        assertMatch(route, '/a/bar', '', {
            foo: ['bar'],
        });
        assertMatch(route, '/a/%20', '', {
            foo: [' '],
        });
        assertMatch(route, '/a/bar/baz', '', {
            foo: ['bar', 'baz'],
        });
        assertNoMatch(route, '/a/', '');
        assertMatch(route, '/a', '', {
            foo: [],
        });
        assertNoMatch(route, '/a//', '');
    }

    @test
    'parses "one or more" parameters correctly'(): void {
        type RouteData = {
            foo: string[];
        };
        const route = new Route<RouteData>('/a/:foo+');
        assertMatch(route, '/a/bar', '', {
            foo: ['bar'],
        });
        assertMatch(route, '/a/%20', '', {
            foo: [' '],
        });
        assertMatch(route, '/a/bar/baz', '', {
            foo: ['bar', 'baz'],
        });
        assertNoMatch(route, '/a/', '');
        assertNoMatch(route, '/a', '');
        assertNoMatch(route, '/a//', '');
    }

    @test
    'parses query parameters correctly'(): void {
        type RouteData = {
            foo?: string;
        };
        const route = new Route<RouteData>('/a', ['foo']);
        assertMatch(route, '/a', '?', {});
        assertMatch(route, '/a', '?foo', {
            foo: '',
        });
        assertMatch(route, '/a', '?foo=bar%20', {
            foo: 'bar ',
        });
        assertMatch(route, '/a', '?foo=a&foo=b', {
            foo: 'b',
        });
    }

    @test
    'reassembles "one-only" parameters correctly'(): void {
        type RouteData = {
            foo: string;
        };
        const route = new Route<RouteData>('/a/:foo');
        assert.strictEqual(route.toPath({ foo: 'bar' }, ''), '/a/bar');
        assert.strictEqual(route.toPath({ foo: 'bar/' }, ''), '/a/bar%2F');
        assert.strictEqual(route.toPath({ foo: 'bar' }, '/b'), '/b/a/bar');
        assert.strictEqual(route.toPath({ foo: 'bar' }, '/b/'), '/b/a/bar');
        assert.throws(() => route.toPath({ foo: '' }, ''));
    }

    @test
    'reassembles "optional" parameters correctly'(): void {
        type RouteData = {
            foo?: string;
        };
        const route = new Route<RouteData>('/a/:foo?');
        assert.strictEqual(route.toPath({ foo: 'bar' }, ''), '/a/bar');
        assert.strictEqual(route.toPath({}, ''), '/a');
        assert.strictEqual(route.toPath({ foo: 'bar/' }, ''), '/a/bar%2F');
        assert.strictEqual(route.toPath({}, '/b'), '/b/a');
        assert.strictEqual(route.toPath({}, '/b/'), '/b/a');
        assert.throws(() => route.toPath({ foo: '' }, ''));
    }

    @test
    'reassembles "zero or more" parameters correctly'(): void {
        type RouteData = {
            foo: string[];
        };
        const route = new Route<RouteData>('/a/:foo*');
        assert.strictEqual(route.toPath({ foo: [] }, ''), '/a');
        assert.strictEqual(route.toPath({ foo: ['bar'] }, ''), '/a/bar');
        assert.strictEqual(route.toPath({ foo: ['bar/', 'baz'] }, ''), '/a/bar%2F/baz');
        assert.strictEqual(route.toPath({ foo: ['bar', 'baz'] }, '/b'), '/b/a/bar/baz');
        assert.strictEqual(route.toPath({ foo: ['bar', 'baz'] }, '/b/'), '/b/a/bar/baz');
        assert.throws(() => route.toPath({ foo: [''] }, ''));
    }

    @test
    'reassembles "one or more" parameters correctly'(): void {
        type RouteData = {
            foo: string[];
        };
        const route = new Route<RouteData>('/a/:foo+');
        assert.throws(() => route.toPath({ foo: [] }, ''));
        assert.strictEqual(route.toPath({ foo: ['bar'] }, ''), '/a/bar');
        assert.strictEqual(route.toPath({ foo: ['bar/', 'baz'] }, ''), '/a/bar%2F/baz');
        assert.strictEqual(route.toPath({ foo: ['bar', 'baz'] }, '/b'), '/b/a/bar/baz');
        assert.strictEqual(route.toPath({ foo: ['bar', 'baz'] }, '/b/'), '/b/a/bar/baz');
        assert.throws(() => route.toPath({ foo: [''] }, ''));
    }

    @test
    'reassembles query parameters correctly'(): void {
        type RouteData = {
            foo?: string;
            goo?: string;
        };
        const route = new Route<RouteData>('/a', ['foo', 'goo']);
        assert.strictEqual(route.toPath({}, ''), '/a');
        assert.strictEqual(route.toPath({ goo: '', foo: '' }, ''), '/a?foo=&goo=');
        assert.strictEqual(route.toPath({ foo: '/' }, ''), '/a?foo=%2F');
    }

    @test
    'extends preserves ordering of query params'(): void {
        interface BaseRouteData {
            foo?: string;
            goo?: string;
        }
        interface DerivedRouteData extends BaseRouteData {
            loo?: string;
            hoge?: string;
        }
        const baseRoute = new Route<BaseRouteData>('/a', ['foo', 'goo']);
        const derivedRoute = baseRoute.extend<DerivedRouteData>('b', ['loo', 'hoge']);
        const actual = derivedRoute.toPath({ foo: 'a', goo: 'b', loo: 'c', hoge: 'd' }, '');
        assert.strictEqual(actual, '/a/b?foo=a&goo=b&loo=c&hoge=d');
    }
}

function assertMatch<T>(route: Route<T>, pathname: string, search: string, data: T): void {
    assert.strictEqual(route.testPath(pathname, search), true);
    assert.deepStrictEqual(route.matchPath(pathname, search), data);
}

function assertNoMatch<T>(route: Route<T>, pathname: string, search: string): void {
    assert.strictEqual(route.testPath(pathname, search), false);
    assert.strictEqual(route.matchPath(pathname, search), null);
}

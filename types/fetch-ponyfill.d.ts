declare function fetchPonyfill(): {
    fetch: typeof fetch,
    Headers: Headers,
    Request: Request,
    Response: Response,
};

declare namespace fetchPonyfill {}

export = fetchPonyfill;

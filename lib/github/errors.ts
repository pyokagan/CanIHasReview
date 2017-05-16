/**
 * Base GitHub library error class.
 */
export class GithubError extends Error {
}

/**
 * Error returned by the GitHub API server.
 */
export class ServerError extends GithubError {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

/**
 * Error occurred while parsing GitHub's response.
 */
export class ParseError extends GithubError {
}

/**
 * GitHub's response failed our JSON validation checks.
 */
export class JsonValidationError extends ParseError {
    readonly json: any;

    constructor(json: any) {
        super(`JSON validation failed: ${JSON.stringify(json, null, 2)}`);
        this.json = json;
    }
}

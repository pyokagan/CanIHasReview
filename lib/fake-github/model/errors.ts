export class JsonValidationError extends Error {
    readonly json: any;

    constructor(json: any) {
        super(`JSON validation failed: ${JSON.stringify(json, null, 2)}`);
        this.json = json;
    }
}

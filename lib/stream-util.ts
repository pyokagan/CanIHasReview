/**
 * @module
 * Nodejs stream utilities.
 */
import stream from 'stream';

export class LineTransform extends stream.Transform {
    private mapFn: (line: Buffer) => Buffer;
    private leftover: Buffer[];
    private sep: number;

    constructor(mapFn: (line: Buffer) => Buffer, sep?: string | number) {
        super({});
        this.mapFn = mapFn;
        this.leftover = [];
        if (typeof sep === 'string') {
            this.sep = sep.charCodeAt(0);
        } else if (typeof sep === 'number') {
            this.sep = sep;
        } else {
            this.sep = '\n'.charCodeAt(0);
        }
    }

    _transform(chunk: Buffer, encoding: string, cb: (err?: any) => void): void {
        try {
            // Slice up the chunk
            let idx = 0, lastIdx = 0;
            while (true) {
                idx = chunk.indexOf(this.sep, lastIdx);
                if (idx < 0) {
                    break;
                }

                idx += 1;

                let line: Buffer;
                if (this.leftover.length) {
                    this.leftover.push(chunk.slice(lastIdx, idx));
                    line = Buffer.concat(this.leftover);
                    this.leftover.length = 0;
                } else {
                    line = chunk.slice(lastIdx, idx);
                }

                this.push(this.mapFn(line));
                lastIdx = idx;
            }

            if (lastIdx < chunk.length) {
                this.leftover.push(chunk.slice(lastIdx));
            }
        } catch (e) {
            cb(e);
            return;
        }

        cb();
    }

    _flush(cb: (err?: any) => void): void {
        try {
            if (this.leftover.length) {
                const lastBuf = this.leftover[this.leftover.length - 1];
                if (lastBuf[lastBuf.length - 1] !== this.sep) {
                    this.leftover.push(Buffer.from([this.sep]));
                }
                const line = Buffer.concat(this.leftover);
                this.push(this.mapFn(line));
            }
        } catch (e) {
            cb(e);
            return;
        }
        cb();
    }
}

export class LinePrefixTransform extends LineTransform {
    constructor(prefix: Buffer | string) {
        super(LinePrefixTransform.makeMapFn(prefix));
    }

    private static makeMapFn(prefix: Buffer | string): (line: Buffer) => Buffer {
        if (Buffer.isBuffer(prefix)) {
            return line => Buffer.concat([prefix, line]);
        } else {
            const encodedPrefix = Buffer.from(prefix, 'utf8');
            return line => Buffer.concat([encodedPrefix, line]);
        }
    }
}

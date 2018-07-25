/**
 * @module
 * Shell scripting utility.
 * (Node only)
 */
import childProcess from 'child_process';
import stream from 'stream';

export interface ShellOptions {
    stdin?: 'ignore' | 'inherit' | NodeJS.ReadableStream;
    stdout?: 'ignore' | 'inherit' | NodeJS.WritableStream;
    stderr?: 'ignore' | 'inherit' | NodeJS.WritableStream;
    cwd?: string;
    env?: { [key: string]: string };
    encoding?: string;
    console?: Console;
}

export function call(command: string, args: string[], options: ShellOptions = {}): Promise<number> {
    return new Promise<number>((resolve, reject) => {
        const spawnOpts: childProcess.SpawnOptions = {
            cwd: options.cwd,
            env: options.env,
            stdio: [
                toPipe(options.stdin) || 'inherit',
                toPipe(options.stdout) || 'inherit',
                toPipe(options.stderr) || 'inherit',
            ],
        };
        if (options.console) {
            options.console.log(`Running ${command} ${JSON.stringify(args)}`);
        }
        const cp = childProcess.spawn(command, args, spawnOpts);
        cp.on('error', e => {
            reject(e);
        });
        cp.on('exit', (code, signal) => {
            resolve(code);
        });
        if (options.stdin instanceof stream.Readable) {
            options.stdin.pipe(cp.stdin);
        }
        if (options.stdout instanceof stream.Writable) {
            cp.stdout.pipe(options.stdout, { end: false });
        }
        if (options.stderr instanceof stream.Writable) {
            cp.stderr.pipe(options.stderr, { end: false });
        }
    });
}

export function checkCall(command: string, args: string[], options: ShellOptions = {}): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        const spawnOpts: childProcess.SpawnOptions = {
            cwd: options.cwd,
            env: options.env,
            stdio: [
                toPipe(options.stdin) || 'inherit',
                toPipe(options.stdout) || 'inherit',
                toPipe(options.stderr) || 'inherit',
            ],
        };
        if (options.console) {
            options.console.log(`Running ${command} ${JSON.stringify(args)}`);
        }
        const cp = childProcess.spawn(command, args, spawnOpts);
        cp.on('error', e => {
            reject(e);
        });
        cp.on('exit', (code, signal) => {
            if (code === 0) {
                return resolve();
            }
            reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
        });
        if (options.stdin instanceof stream.Readable) {
            options.stdin.pipe(cp.stdin);
        }
        if (options.stdout instanceof stream.Writable) {
            cp.stdout.pipe(options.stdout, { end: false });
        }
        if (options.stderr instanceof stream.Writable) {
            cp.stderr.pipe(options.stderr, { end: false });
        }
    });
}

export function checkOutput(command: string, args: string[], options: ShellOptions = {}): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const spawnOpts: childProcess.SpawnOptions = {
            cwd: options.cwd,
            env: options.env,
            stdio: [ toPipe(options.stdin) || 'inherit', 'pipe', toPipe(options.stderr) || 'inherit' ],
        };
        if (options.console) {
            options.console.log(`Running ${command} ${JSON.stringify(args)}`);
        }
        const encoding = options.encoding || 'utf-8';
        const cp = childProcess.spawn(command, args, spawnOpts);
        const outBuf: string[] = [];
        cp.on('error', e => {
            reject(e);
        });
        cp.stdout.on('data', data => {
            outBuf.push(typeof data === 'string' ? data : data.toString(encoding));
        });
        cp.on('exit', (code, signal) => {
            const output = outBuf.join('');
            if (code === 0) {
                return resolve(output);
            }
            const err: any = new Error(`Command failed: ${command} ${args.join(' ')}`);
            err.stdout = output;
            reject(err);
        });
        if (options.stdin instanceof stream.Readable) {
            options.stdin.pipe(cp.stdin);
        }
        if (options.stderr instanceof stream.Writable) {
            cp.stderr.pipe(options.stderr, { end: false });
        }
    });
}

export interface Shell {
    call(command: string, args: string[], options?: ShellOptions): Promise<number>;
    checkCall(command: string, args: string[], options?: ShellOptions): Promise<void>;
    checkOutput(command: string, args: string[], options?: ShellOptions): Promise<string>;
}

export class SimpleShell {
    private options: ShellOptions;

    constructor(options?: ShellOptions) {
        this.options = Object.assign({}, options);
    }

    call(command: string, args: string[], options?: ShellOptions): Promise<number> {
        const opts = Object.assign({}, this.options, options);
        return call(command, args, opts);
    }

    checkCall(command: string, args: string[], options?: ShellOptions): Promise<void> {
        const opts = Object.assign({}, this.options, options);
        return checkCall(command, args, opts);
    }

    checkOutput(command: string, args: string[], options?: ShellOptions): Promise<string> {
        const opts = Object.assign({}, this.options, options);
        return checkOutput(command, args, opts);
    }
}

function toPipe(x?: string | NodeJS.ReadableStream | NodeJS.WritableStream): string | undefined {
    if (!x || typeof x === 'string') {
        return;
    } else {
        return 'pipe';
    }
}

export default Shell;

import * as tmp from 'tmp';

export interface TmpDir {
    path: string;
    cleanup: () => void;
}

export function dir(config?: tmp.Options): Promise<TmpDir> {
    return new Promise<TmpDir>((resolve, reject) => {
        const cb = (err: any, path: string, cleanup: () => void) => {
            err ? reject(err) : resolve({ path, cleanup });
        };
        config ? tmp.dir(config, cb) : tmp.dir(cb);
    });
}

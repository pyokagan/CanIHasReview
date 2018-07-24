import {
    Clock,
    SystemClock,
} from '@lib/clock';
import {
    checkCall,
} from '@lib/shell';
import * as sqlite3 from '@lib/sqlite3-promise';
import * as tmp from '@lib/tmp';
import fs from 'fs-extra';
import path from 'path';

export interface GithubModel {
    dir: string;
    workDir: string;
    clock: Clock;
    db: sqlite3.Database;
    cleanup(): void;
}

type CreateGithubModelOptions = {
    /**
     * Default: Use System clock.
     */
    clock?: Clock;

    /**
     * Default: use a temporary directory.
     */
    dir?: string;
};

export async function createGithubModel(opts: CreateGithubModelOptions): Promise<GithubModel> {
    const clock = opts.clock || new SystemClock();
    let tmpDir: tmp.TmpDir | undefined = undefined;
    if (!opts.dir) {
        tmpDir = await tmp.dir({
            unsafeCleanup: true,
        });
    } else {
        await fs.mkdirs(opts.dir);
    }
    const dir = tmpDir ? tmpDir.path : opts.dir;
    if (!dir) {
        throw new Error(`dir is undefined, should not occur: ${dir}`);
    }
    await fs.mkdirs(path.join(dir, 'repos'));
    const db = await openDb(path.join(dir, 'db.sqlite3'));
    const tmpWorkDir = await tmp.dir({
        unsafeCleanup: true,
    });
    await checkCall('git', ['init', '--bare'], { cwd: tmpWorkDir.path });
    return {
        cleanup(): void {
            if (tmpDir) {
                tmpDir.cleanup();
            }
            tmpWorkDir.cleanup();
            db.close();
        },
        clock,
        db,
        dir,
        workDir: tmpWorkDir.path,
    };
}

async function openDb(filename: string): Promise<sqlite3.Database> {
    const db = await sqlite3.open(filename);
    const version = await getVersion(db);
    if (version <= 0) {
        await createDb(db);
    }
    return db;
}

async function getVersion(db: sqlite3.Database): Promise<number> {
    try {
        const obj = await sqlite3.get(db, `select value from config where key = "version"`, []);
        if (!obj || typeof obj.value !== 'string') {
            return 0;
        }
        return parseInt(obj.value);
    } catch (e) {
        return 0;
    }
}

async function createDb(db: sqlite3.Database): Promise<void> {
    await sqlite3.exec(db, `
        begin exclusive transaction;
        create table config(key text, value text);
        create table users(
            id integer primary key,
            login unique not null,
            type text not null default('User'),
            name text,
            company text,
            blog text not null default(''),
            location text,
            email text,
            hireable integer default(0),
            bio text
        );
        create table repos(
            id integer primary key,
            userid integer,
            name text not null,
            description text,
            private integer not null default(0),
            fork integer not null default(0),
            homepage text,
            unique(userid, name),
            foreign key(userid) references users(id)
        );
        create table issues(
            id integer primary key,
            repoid integer,
            nr integer,
            type text not null,
            userid integer,
            title text not null default(''),
            body text not null default(''),
            state text not null default('open'),
            head text,
            base text,
            merged integer not null default(0),
            unique(repoid, nr),
            foreign key(repoid) references repos(id),
            foreign key(userid) references users(id)
        );
        create table issue_comments(
            id integer primary key,
            issueid integer,
            userid integer,
            body text,
            foreign key(userid) references users(id),
            foreign key(issueid) references issues(id)
        );
        create table labels(
            id integer primary key,
            repoid integer,
            name text,
            unique(repoid, name),
            foreign key(repoid) references repos(id)
        );
        create table oauthclients(
            id text primary key,
            secret text
        );
        create table oauthtokens(
            id text primary key,
            clientid text,
            userid integer,
            foreign key(clientid) references oauthclients(id),
            foreign key(userid) references users(id)
        );
        create table apps(
            id integer primary key,
            name text not null,
            userid integer,
            oauthclientid text,
            publickey text,
            foreign key(userid) references users(id),
            foreign key(oauthclientid) references oauthclients(id)
        );
        create table installations(
            id integer primary key,
            repoid integer,
            appid integer,
            foreign key(repoid) references repos(id),
            foreign key(appid) references apps(id),
            unique(repoid, appid)
        );
        insert into config values("version", 1);
        commit;
    `);
}

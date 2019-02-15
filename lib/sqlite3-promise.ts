/**
 * @module
 * A wrapper around sqlite3 that provides an promise-based API.
 */
import sqlite3 from 'sqlite3';
import {
    Database,
} from 'sqlite3';
export {
    Database,
} from 'sqlite3';

export type Value = string | number | null | Buffer;
export type ValueObject = { [key: string]: Value | undefined };

export async function open(filename: string): Promise<Database> {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(filename, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, err => {
            err ? reject(err) : resolve(db);
        });
    });
}

export async function close(db: Database): Promise<void> {
    return new Promise((resolve, reject) => {
        db.close(err => err ? reject(err) : resolve());
    });
}

export async function exec(db: Database, sql: string): Promise<void> {
    return new Promise((resolve, reject) => {
        db.exec(sql, err => err ? reject(err) : resolve());
    });
}

export async function run(db: Database, sql: string, params: Value[]): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, err => err ? reject(err) : resolve());
    });
}

export async function runWithRowId(db: Database, sql: string, params: Value[]): Promise<number> {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err: Error | null): void {
            err ? reject(err) : resolve(this.lastID);
        });
    });
}

export async function get(db: Database, sql: string, params: Value[]): Promise<ValueObject | undefined> {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
    });
}

export async function all(db: Database, sql: string, params: Value[]): Promise<ValueObject[]> {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows));
    });
}

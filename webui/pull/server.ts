/**
 * @module
 */
import Koa from 'koa';
import compose from 'koa-compose';
import { JobRunner } from '../../lib/job';
import * as Get from './get/server';
import * as Post from './post/server';

interface Options {
    jobRunner: JobRunner<any>;
    githubToken: string;
}

type Middleware = (ctx: Koa.Context, next?: () => Promise<void>) => Promise<void>;

export function createMiddleware(opts: Options): Middleware {
    return compose<Koa.Context>([
        Get.middleware,
        Post.createMiddleware({
            githubToken: opts.githubToken,
            jobRunner: opts.jobRunner,
        }),
    ]);
}

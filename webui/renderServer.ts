/**
 * @module
 * React-based rendering engine (server-side).
 * @see renderClient
 */
import escape from 'lodash/escape';
import fs from 'mz/fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { RenderCtx } from './RenderCtx';

/**
 * External stylesheets to be inserted into the HTML as `<link>` tags.
 */
const externalStylesheets: string[] = [
    require('!file-loader!bootstrap/dist/css/bootstrap.min.css'),
    require('!file-loader!spinkit/css/spinkit.css'),
    require('!file-loader!./template.css'),
];

/**
 * Mapping of entry point names to their assets. e.g.
 *
 *     {
 *         'webui/error': ['/static/commons.js', '/static/webui_error.js'],
 *         'webui/home': ['/static/commons.js', '/static/webui_home.js'],
 *         ...
 *     }
 */
const entryPoints: { [name: string]: string[] | undefined } = (() => {
    const entryPointsFile = path.resolve(__webpack_dirname, 'webui.json');
    const fileContent = fs.readFileSync(entryPointsFile, 'utf-8');
    return JSON.parse(fileContent);
})();

/**
 * Render a React component on the server-side.
 */
export function renderServer<P>(
    entryPointName: string,
    title: string,
    type: React.SFC<P>,
    props?: React.Attributes & P): string;
export function renderServer<P,
        T extends React.Component<P, React.ComponentState>,
        C extends React.ComponentClass<P>>(
    entryPointName: string,
    title: string,
    type: React.ClassType<P, T, C>,
    props?: React.ClassAttributes<T> & P): string;
export function renderServer(entryPointName: string, title: string,
        type: any, props: any): string {
    const entryPoint = entryPoints[entryPointName];
    if (!entryPoint) {
        throw new Error(`unknown entry point name ${JSON.stringify(entryPointName)}`);
    }

    const elem = React.createElement(type, props);
    const html = ReactDOMServer.renderToString(elem);
    const json = props ? JSON.stringify(props) : 'undefined';
    const stylesheetLinks = externalStylesheets
        .map(x => `<link rel="stylesheet" href="${x}">`)
        .join('\n');
    const jsAssets = entryPoint
        .filter(x => x.endsWith('.js'))
        .map(x => `<script type="text/javascript" src="${x}"></script>`)
        .join('\n');

    return `<!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${escape(title)}</title>
            ${stylesheetLinks}
        </head>
        <body>
            <div id="app">${html}</div>
            <script type="text/javascript">
                var __INIT_PROPS = ${json};
            </script>
            ${jsAssets}
        </body>
        </html>
    `;
}

export async function middleware(ctx: Partial<RenderCtx>, next: () => Promise<void>): Promise<void> {
    ctx.render = (entryPointName: string, title: string, type: any, props: any) => {
        const ctxWithBody: Partial<RenderCtx> & { body?: any } = ctx;
        ctxWithBody.body = renderServer(entryPointName, title, type, props);
    };
    await next();
}

export default middleware;

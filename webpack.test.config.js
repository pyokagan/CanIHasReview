'use strict';
const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const webpackNodeExternals = require('webpack-node-externals');
const baseConfig = require('./webpack.base.config');
const isCoverage = process.env.NODE_ENV === 'coverage';

const rules = [];
if (isCoverage) {
    rules.push({
        test: /\.(js|tsx?)$/,
        include: [
            path.resolve(__dirname, 'lib'),
            path.resolve(__dirname, 'webui'),
        ],
        enforce: 'post',
        use: {
            loader: 'istanbul-instrumenter-loader',
            options: { esModules: true },
        },
    });
}

module.exports = webpackMerge(baseConfig, {
    target: 'node',
    externals: [webpackNodeExternals()],
    plugins: [
        new webpack.BannerPlugin({
            banner: 'var __webpack_dirname = __dirname;\n' +
                'var __webpack_filename = __filename;\n' +
                'var __webpack_mocha = true;',
            raw: true,
            entryOnly: true,
        }),
    ],
    node: {
        __dirname: true,
        __filename: true,
    },
    module: {
        rules,
    },
    devtool: 'inline-cheap-module-source-map',
});

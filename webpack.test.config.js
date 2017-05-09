'use strict';
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const webpackNodeExternals = require('webpack-node-externals');
const baseConfig = require('./webpack.base.config');

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
});

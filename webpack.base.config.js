'use strict';
const path = require('path');
const appConfig = require('./config');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist', appConfig.publicOutputDir),
        filename: '[name].js',
        publicPath: appConfig.publicPath,
    },
    devtool: 'source-map',
    module: {
        rules: [{
            test: /\.(png|svg|jpg|gif|woff|woff2|eot|ttf|otf)$/,
            use: [
                { loader: 'file-loader' },
            ],
        }],
    },
};

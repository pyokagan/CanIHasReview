'use strict';
const path = require('path');
const appConfig = require('./config');
const tsConfig = require('./tsconfig.json');

const resolveAliases = {};
Object.entries(tsConfig.compilerOptions.paths)
    .filter(pair => !pair[0].endsWith('*'))
    .forEach(pair => resolveAliases[pair[0]] = path.resolve(__dirname, pair[1][0]));

module.exports = {
    mode: 'none',
    output: {
        path: path.resolve(__dirname, 'dist', appConfig.publicOutputDir),
        filename: '[name].js',
        publicPath: appConfig.publicPath,
    },
    devtool: 'source-map',
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.json'],
        alias: resolveAliases,
    },
    module: {
        rules: [{
            test: /\.(png|svg|jpg|gif|woff|woff2|eot|ttf|otf)$/,
            use: [
                { loader: 'file-loader' },
            ],
        }, {
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/,
        }],
    },
};

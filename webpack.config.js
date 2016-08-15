var ExtractTextPlugin = require('extract-text-webpack-plugin');
var extractLESS = new ExtractTextPlugin('[name].css');

module.exports = {
    entry: './src/main.js',
    output: {
        path: './dist',
        filename: 'app.bundle.js'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
            },{
                test: /\.less$/,
                loader: extractLESS.extract(['css','less'])
            },{
                test: /\.png$/,
                loader: 'file-loader?name=images/[name].png'
            },{
                test: /\.svg$/,
                loader: 'file-loader?name=pictos/[name].svg'
            }
        ]
    },
    plugins: [
        extractLESS
    ]
};

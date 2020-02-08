
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
                test: /\.png$/,
                loader: 'file-loader?name=images/[name].png'
            },{
                test: /\.svg$/,
                loader: 'file-loader?name=pictos/[name].svg'
            }
        ]
    }
};

module.exports = {
    entry: {
        login: './login.js',
        raffle: './raffle.js'
    },
    output: {
        filename: '[name].bundle.js',
    },
    module: {
        loaders: [
        ]
    },
    externals: {
    },
    resolve: {
        extensions: ['', '.js']
    }
}


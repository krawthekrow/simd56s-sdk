const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

const htmlPlugin = new HtmlWebPackPlugin({
	template: './src/index.html',
	filename: './index.html'
});

module.exports = {
	entry: './src/index.jsx',
	devtool: 'eval-source-map',
	resolve: {
		modules: [
			path.resolve('./src'),
			path.resolve('./node_modules')
		]
	},
	module: {
		rules: [{
			test: /\.jsx?$/,
			exclude: /node_modules/,
			use: {
				loader: 'babel-loader',
			},
		}, {
			test: /\.(css)$/,
			use: [{
				loader: 'style-loader'
			}, {
				loader: 'css-loader'
			}],
		}, {
			test: /\.(scss)$/,
			use: [{
				loader: 'style-loader'
			}, {
				loader: 'css-loader',
			}, {
				loader: 'postcss-loader',
				options: {
					plugins: () => {
						return [
							require('autoprefixer'),
						];
					},
				},
			}, {
				loader: 'sass-loader',
			}],
		}, {
			test: /\.s$/,
			include: [
				path.resolve(__dirname, 'prog/samples')
			],
			use: {
				loader: 'raw-loader'
			},
		}],
	},
	plugins: [htmlPlugin],
};

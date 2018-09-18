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
				loader: 'babel-loader'
			}
		}, {
			test: /\.(css)$/,
			use: [{
				loader: 'style-loader'
			}, {
				loader: 'css-loader'
			}]
		}, {
			test: /\.(scss)$/,
			use: [{
				loader: 'style-loader'
			}, {
				loader: 'css-loader',
				query: {
					modules: true,
					localIdentName: '[name]__[local]___[hash:base64:5]'
				}
			}, {
				loader: 'postcss-loader',
				options: {
					plugins: () => {
						return [
							require('precss'),
							require('autoprefixer')
						];
					}
				}
			}, {
				loader: 'sass-loader'
			}]
		}]
	},
	plugins: [htmlPlugin]
};

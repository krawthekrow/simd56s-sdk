const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: [
		'./src/index.jsx',
	],
	resolve: {
		modules: [
			path.resolve(__dirname, 'node_modules'),
			path.resolve(__dirname, 'src'),
		],
	},
	output: {
		path: path.resolve(__dirname, 'dist'),
	},
	module: {
		rules: [{
			test: /\.jsx?$/,
			exclude: /node_modules/,
			use: {
				loader: 'babel-loader',
				options: {
					presets: [
						'@babel/preset-env',
						'@babel/preset-react',
					],
				},
			},
		}, {
			test: /\.css$/,
			use: [{
				loader: 'style-loader'
			}, {
				loader: 'css-loader'
			}],
		}, {
			test: /\.(html|s)$/,
			use: {
				loader: 'raw-loader',
			},
		}],
	},
	plugins: [
		new HtmlWebPackPlugin({
			template: './src/index.html',
			filename: './index.html',
		}),
	],
};

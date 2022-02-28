import styles from './scss/gpu-sim-main.scss';

import React from 'react';
import ReactDOM from 'react-dom';

import {Dimensions, Vector, Rect} from 'utils/Utils.js';

import GpuSimController from './sim/GpuSimController.js';

class GpuSimGui extends React.Component {
	constructor(props) {
		super(props);
		this.SCREEN_CANVAS_DIMS = new Dimensions(400, 400);
		this.SCREEN_BOUNDING_RECT = new Rect(
			new Vector(0, 0),
			this.SCREEN_CANVAS_DIMS
		);
	}
	componentDidMount() {
		this.screenCtx = this.screenCanvas.getContext('2d');
		this.controller = new GpuSimController(
			this.screenCtx, this.SCREEN_BOUNDING_RECT);
		this.controller.startSim();
	}
	componentWillUnmount() {
	}
	render() {
		return [
			<canvas key="mainCanvas" width={this.SCREEN_CANVAS_DIMS.width} height={this.SCREEN_CANVAS_DIMS.height} className={styles.screenCanvas} ref={canvas => {this.screenCanvas = canvas;}}>
				The SIMD56S simulator requires canvas to work. Please upgrade your browser.
			</canvas>
		];
	}
};

ReactDOM.render(<GpuSimGui/>, document.getElementById('index'));

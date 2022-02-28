import React from 'react';

import produce from 'immer';

import {Dimensions, Vector, Rect} from 'util/Utils.js';
import GpuSimController from 'sim/GpuSimController.js';

class App extends React.Component {
	constructor(props) {
		super(props);
		this.SCREEN_CANVAS_DIMS = new Dimensions(4*56*2, 4*56*2);
		this.SCREEN_BOUNDING_RECT = new Rect(
			new Vector(0, 0),
			this.SCREEN_CANVAS_DIMS
		);
		this.state = {
			fps: 0,
		};
	}
	componentDidMount() {
		this.screenCtx = this.screenCanvas.getContext('2d');
		this.controller = new GpuSimController(
			this.screenCtx, this.SCREEN_BOUNDING_RECT,
			() => {
				this.setState(produce(this.state, (state) => {
					state.fps = this.controller.fpsTracker.getAvgFps();
				}));
			}
		);
		this.controller.startSim();
	}
	componentWillUnmount() {
	}
	render() {
		return <div style={{
			display: 'flex',
		}}>
			<div style={{
				flex: 1,
			}}></div>
			<div>
				<canvas
					key="mainCanvas"
					width={this.SCREEN_CANVAS_DIMS.width}
					height={this.SCREEN_CANVAS_DIMS.height}
					ref={canvas => {this.screenCanvas = canvas;}}
				>
					The SIMD56S simulator requires canvas to work. Please upgrade your browser.
				</canvas>
			</div>
			<div className="px-3" style={{
				flex: 1,
			}}>
				<span>FPS: {this.state.fps.toFixed(1)}</span>
			</div>
		</div>;
	}
};

export default App;

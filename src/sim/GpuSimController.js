import {Dimensions, Vector, Rect, Utils} from 'util/Utils.js';
import GpuModel from 'sim/GpuModel.js';
import {Arch} from 'sim/Arch.js';

const FRAME_INTERVAL = 1e3 / 60.0;

class FpsTracker {
	constructor() {
		this.samples = [1000.0];
	}
	addSample(lat) {
		this.samples.push(lat);
		if (this.samples.length > FpsTracker.NUM_SAMPLES) {
			this.samples.shift();
		}
	}
	// in milliseconds
	getAvgLat() {
		return this.samples.reduce((s, x) => s + x, 0) / this.samples.length;
	}
	getAvgFps() {
		return 1e3 / this.getAvgLat();
	}
};
FpsTracker.NUM_SAMPLES = 30;

class GpuSimController {
	constructor(screenCtx, screenBoundingRect, notifyFrame) {
		this.notifyFrame = notifyFrame;
		this.prevFrameTime = 0;
		this.simRunning = false;
		this.simTimeLeft = 4; // in frames
		this.limitSimTime = true;
		this.fpsTracker = new FpsTracker();
		this.gpu = new GpuModel(screenCtx, screenBoundingRect);

		this.gpu.colorRam.palette[0] = 0xAAFFAA;
		this.gpu.colorRam.palette[1] = 0x000000;
	}
	startSim() {
		this.prevFrameTime = Date.now();
		this.simRunning = true;
		requestAnimationFrame(() => this.updateSimWrapper());
	}
	updateSim() {
		this.gpu.update();
	}
	updateSimWrapper() {
		if (!this.simRunning)
			return;
		const currFrameTime = Date.now();
		const elapsed = currFrameTime - this.prevFrameTime;
		if (elapsed >= FRAME_INTERVAL) {
			if (elapsed >= 2 * FRAME_INTERVAL) {
				this.prevFrameTime = currFrameTime;
				this.fpsTracker.addSample(elapsed);
			}
			else {
				this.prevFrameTime += FRAME_INTERVAL;
				this.fpsTracker.addSample(FRAME_INTERVAL);
			}
			this.notifyFrame();
			this.updateSim();

			if (this.limitSimTime) {
				this.simTimeLeft--;
				if (this.simTimeLeft <= 0) {
					this.simRunning = false;
				}
			}
		}
		requestAnimationFrame(() => this.updateSimWrapper());
	}
};

export default GpuSimController;

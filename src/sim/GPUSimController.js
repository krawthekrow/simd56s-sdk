import {Dimensions, Vector, Rect, Utils} from 'utils/Utils.js';

const FRAME_INTERVAL = 1000.0 / 60.0;

function colorToCssString(color) {
	return '#' + Utils.padStr(color.toString(16), 6);
}

class GPUSimController {
	constructor(screenCtx, screenBoundingRect) {
		this.screenCtx = screenCtx;
		this.screenBoundingRect = screenBoundingRect;
		this.prevFrameTime = 0;
		this.simRunning = false;
		this.debugFrameCounter = 0;
	}
	startSim() {
		this.prevFrameTime = Date.now();
		this.simRunning = true;
		requestAnimationFrame(() => this.updateSimWrapper());
	}
	updateSim() {
		const boundingRect = this.screenBoundingRect;
		const pixDims = new Dimensions(
			boundingRect.width / 56,
			boundingRect.height / 56);
		for (let i = 0; i < 56; i++) {
			for (let j = 0; j < 56; j++) {
				const pixIndex = i * 56 + j;
				const offset = pixIndex * 4;
				const debugSpecial = this.debugFrameCounter % (56 * 56) == pixIndex;
				if (debugSpecial)
					this.screenCtx.fillStyle = colorToCssString(0xFF0000);
				else
					this.screenCtx.fillStyle = colorToCssString(0x00FF00);
				this.screenCtx.fillRect(
					boundingRect.x + j * pixDims.width,
					boundingRect.y + i * pixDims.height,
					pixDims.width, pixDims.height);
			}
		}
		this.debugFrameCounter++;
	}
	updateSimWrapper() {
		if (!this.simRunning)
			return;
		const currFrameTime = Date.now();
		const elapsed = currFrameTime - this.prevFrameTime;
		if (elapsed >= FRAME_INTERVAL) {
			if (elapsed >= 2 * FRAME_INTERVAL)
				this.prevFrameTime = currFrameTime;
			else
				this.prevFrameTime += FRAME_INTERVAL;
			this.updateSim();
		}
		requestAnimationFrame(() => this.updateSimWrapper());
	}
};

module.exports = GPUSimController;

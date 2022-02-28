import {Dimensions, Vector, Rect, Utils} from 'utils/Utils.js';
import GpuModel from 'sim/GpuModel.js';
import {Arch} from 'sim/Arch.js';
import Programs from 'prog/Programs.js';
import Assembler from 'prog/Assembler.js';
import PROG_PARSERTEST from 'raw-loader!prog/samples/parsertest.s';

const FRAME_INTERVAL = 1000.0 / 60.0;

function colorToCssString(color) {
	return '#' + Utils.padStr(color.toString(16), 6);
}

class GpuSimController {
	constructor(screenCtx, screenBoundingRect) {
		this.screenCtx = screenCtx;
		this.screenBoundingRect = screenBoundingRect;
		this.prevFrameTime = 0;
		this.simRunning = false;
		this.debugFrameCounter = 0;
		this.debugNextFrame = 0;
		this.gpu = new GpuModel();

		// for (let i = 0; i < Arch.PALETTE_NUM; i++) {
		// 	this.gpu.palette[i] = Utils.randInt(1 << 24);
		// }
		this.gpu.palette[0] = 0xAAFFAA;
		this.gpu.palette[1] = 0x000000;

		this.gpu.utils.clear(0, true);
		this.gpu.loadRand(1);

		Assembler.assemble({
			'parsertest.s': PROG_PARSERTEST
		}, 'parsertest.s');
	}
	startSim() {
		this.prevFrameTime = Date.now();
		this.simRunning = true;
		requestAnimationFrame(() => this.updateSimWrapper());
	}
	updateSim() {
		this.gpu.update();

		if (this.debugFrameCounter == this.debugNextFrame) {
			this.gpu.debugOpCount = 0;
			Programs.gol(this.gpu);
			this.gpu.utils.writeStrToScreen('HELLO WORLD!', 1, 1, this.gpu.palette[0], this.gpu.palette[1]);
			this.debugNextFrame += Math.floor(this.gpu.debugOpCount / 4);
		}

		const boundingRect = this.screenBoundingRect;
		const pixDims = new Dimensions(
			boundingRect.width / Arch.VREG_DIM.width / 2,
			boundingRect.height / Arch.VREG_DIM.height / 2);
		for (let i = 0; i < Arch.VREG_DIM.height * 2; i++) {
			for (let j = 0; j < Arch.VREG_DIM.width * 2; j++) {
				const pixIndex = i * Arch.VREG_DIM.width * 2 + j;

				// const debugSpecial = this.debugFrameCounter % Arch.VREG_DIM.getArea() == pixIndex;
				// if (debugSpecial)
				// 	this.screenCtx.fillStyle = colorToCssString(0xFF0000);
				// else
				// 	this.screenCtx.fillStyle = colorToCssString(0x00FF00);
				let col = this.gpu.screen.buf[pixIndex];

				if (this.gpu.touchOn && (i & 1) == 1 && (j & 1) == 1)
					col = 0x544141;

				this.screenCtx.fillStyle = colorToCssString(col);

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

module.exports = GpuSimController;

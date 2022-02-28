import {Dimensions, Vector, Rect, Utils} from 'util/Utils.js';
import {Arch, Vreg, Reg, BoolReg, ColorReg} from 'sim/Arch.js';
import CHAR_DICT from 'sim/charDict.json';

class VrngModel {
	constructor() {
		this.regs = [];
		for (let i = 0; i < Arch.VREG_DIM.height * 2; i++) {
			this.regs.push(new Reg());
			this.regs[i].rand();
		}
	}
	update() {
		for (let i = this.regs.length - 1; i >= Arch.VRNG_CORES; i--) {
			this.regs[i].assign(this.regs[i - Arch.VRNG_CORES]);
		}
		for (let i = 0; i < Arch.VRNG_CORES; i++) {
			this.regs[i].rand();
		}
	}
};

class RegsToVregModel {
	constructor() {
		// inputs to be assigned by parent
		this.regsIn = null;

		this.vregOut = new Vreg();
	}
	update() {
		this.vregOut.fromRegArr(this.regsIn);
	}
};

class ShifterModel {
	constructor() {
		// inputs to be assigned by parent
		this.shiftX = null;
		this.shiftY = null;
		this.dataIn = null;

		this.dataOut = new Vreg();
	}
	update() {
		this.dataIn.forEach((x, y, val) => {
			this.dataOut.setPix(x + this.shiftX.data, y + this.shiftY.data, val);
		});
	}
}

class ColorRamModel {
	constructor() {
		this.palette = [];
		for (let i = 0; i < Arch.PALETTE_NUM; i++) {
			this.palette.push(0x000000);
		}

		// inputs to be assigned by parent
		this.addrIn = null;

		this.colorOut = new ColorReg();
	}
	update() {
		this.colorOut.data = this.palette[this.addrIn.data];
	}
};

class PixelDisplayModel {
	constructor(screenCtx, boundingRect) {
		this.screenCtx = screenCtx;
		this.boundingRect = boundingRect;

		this.pixColor = 0x000000;

		// inputs to be assigned by parent
		this.doDraw = null;
		this.dataIn = null;
		this.colorIn = null;
		this.colorWe = null;

		this.reset();
	}
	reset() {
		this.screenCtx.fillStyle = Utils.colorToCssString(0x000000);
		const boundingRect = this.boundingRect;
		this.screenCtx.fillRect(
			boundingRect.x, boundingRect.y,
			boundingRect.width, boundingRect.height
		);
	}
	getPixDims() {
		return new Dimensions(
			this.boundingRect.width / Arch.VREG_DIM.width,
			this.boundingRect.height / Arch.VREG_DIM.height);
	}
	update() {
		if (this.colorWe.data) {
			this.pixColor = this.colorIn.data;
		}
		if (!this.doDraw.data) {
			return;
		}
		const pixDims = this.getPixDims();
		this.screenCtx.fillStyle = Utils.colorToCssString(this.pixColor);
		this.dataIn.forEach((x, y, val) => {
			if (!val) {
				return;
			}
			this.screenCtx.fillRect(
				this.boundingRect.x + x * pixDims.width,
				this.boundingRect.y + y * pixDims.height,
				pixDims.width, pixDims.height);
		});
	}
};

class TextDisplayModel {
	constructor(screenCtx, boundingRect) {
		this.screenCtx = screenCtx;
		this.boundingRect = boundingRect;

		this.fgcol = 0xFFFFFF;
		this.bgcol = 0x000000;

		// inputs to be assigned by parent
		this.colorIn = null;
		this.fgcolWe = null;
		this.bgcolWe = null;
		this.xIn = null;
		this.yIn = null;
		this.charIn = null;
		this.doDraw = null;
	}
	writeChar(c, x, y, bgcol, fgcol) {
		const pixDims = new Dimensions(
			this.boundingRect.width / Arch.VREG_DIM.width,
			this.boundingRect.height / Arch.VREG_DIM.height);
		for (let i = 0; i < Arch.CHAR_H; i++) {
			for (let j = 0; j < Arch.CHAR_W; j++) {
				const charData =
					(c in CHAR_DICT.chars) ?
					CHAR_DICT.chars[c] : CHAR_DICT.chars[' '];
				const isFg = (
					i == Arch.CHAR_H - 1 || j == Arch.CHAR_W - 1 ||
					charData[i * (Arch.CHAR_W - 1) + j] == '0'
				);
				const col = isFg ? fgcol : bgcol;
				const pixx = x * Arch.CHAR_W + j;
				const pixy = y * Arch.CHAR_H + i;
				this.screenCtx.fillStyle = Utils.colorToCssString(col);
				this.screenCtx.fillRect(
					this.boundingRect.x + pixx * pixDims.width,
					this.boundingRect.y + pixy * pixDims.height,
					pixDims.width, pixDims.height);
			}
		}
	}
	update() {
		if (this.fgcolWe.data) {
			this.fgcol = this.colorIn.data;
		}
		if (this.bgcolWe.data) {
			this.bgcolWe = this.colorIn.data;
		}
		if (!this.doDraw) {
			return;
		}
		const c = String.fromCharCode(this.charIn.data);
		this.writeChar(
			c, this.xIn.data, this.yIn.data,
			this.fgcol, this.bgcol
		);
	}
};

class GpuModel {
	constructor(screenCtx, screenBoundingRect) {
		this.vregs = [];
		for (let i = 0; i < Arch.VREG_NUM; i++) {
			this.vregs.push(new Vreg());
		}

		this.vrng = new VrngModel();

		this.rowMaskLo = new Reg((1 << Arch.REG_BITS) - 1);
		this.rowMaskHi = new Reg((1 << Arch.REG_BITS) - 1);


		// temporary setup for bringup testing
		this.regsToVreg = new RegsToVregModel();
		this.regsToVreg.regsIn = this.vrng.regs;


		this.colorRam = new ColorRamModel();
		this.colorRam.addrIn = new Reg();


		this.pixDisp = new PixelDisplayModel(screenCtx, screenBoundingRect);
		this.pixDisp.doDraw = new BoolReg();
		this.pixDisp.colorIn = this.colorRam.colorOut;
		this.pixDisp.colorWe = new Reg();
		this.pixDisp.dataIn = this.regsToVreg.vregOut;

		this.pixDisp.doDraw.data = true;
		this.pixDisp.colorWe.data = true;


		this.textDisp = new TextDisplayModel(screenCtx, screenBoundingRect);
		this.textDisp.xIn = new Reg();
		this.textDisp.yIn = new Reg();
		this.textDisp.colorIn = this.colorRam.colorOut;
		this.textDisp.fgcolWe = new BoolReg();
		this.textDisp.bgcolWe = new BoolReg();
		this.textDisp.charIn = new Reg();
		this.textDisp.doDraw = new BoolReg();

		this.textDisp.charIn.data = 'G'.charCodeAt(0);
		this.textDisp.doDraw.data = true;
	}
	update() {
		this.colorRam.update();
		this.vrng.update();
		this.regsToVreg.update();
		this.pixDisp.update();
		this.textDisp.update();
	}
};

export default GpuModel;

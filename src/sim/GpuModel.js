import {Dimensions, Vector, Rect, Utils} from 'utils/Utils.js';
import {Arch, Vreg, Reg} from 'sim/Arch.js';
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

class ScreenModel {
	constructor() {
		this.buf = new Uint32Array(Arch.VREG_DIM.getArea() * 4);
	}
	setPix(x, y, col) {
		const stride = Arch.VREG_DIM.width * 2;
		this.buf[(y * 2) * stride + (x * 2)] = col;
		this.buf[(y * 2 + 1) * stride + (x * 2)] = col;
		this.buf[(y * 2) * stride + (x * 2 + 1)] = col;
		this.buf[(y * 2 + 1) * stride + (x * 2 + 1)] = col;
	}
	writeChar(c, x, y, bgcol, fgcol) {
		for (let i = 0; i < Arch.CHAR_H; i++) {
			for (let j = 0; j < Arch.CHAR_W; j++) {
				let col = fgcol;
				const charData = CHAR_DICT.chars[c];
				if (i == Arch.CHAR_H - 1 || j == Arch.CHAR_W - 1)
					col = bgcol;
				else if (charData[i * (Arch.CHAR_W - 1) + j] == '0')
					col = bgcol;
				const pixx = x * Arch.CHAR_W + j;
				const pixy = y * Arch.CHAR_H + i;
				this.buf[pixy * Arch.VREG_DIM.width * 2 + pixx] = col;
			}
		}
	}
};

class GpuUtils {
	constructor(gpu) {
		this.gpu = gpu;
	}
	clear(dest, val = false) {
		this.gpu.alu(dest, this.gpu.vregs[dest], this.gpu.vregs[dest],
			Arch.CLIPRECT_NONE, val ? Arch.TT_XNOR : Arch.TT_XOR);
	}
	aluShift(destReg, src1, src2, truthTable, shiftx = 0, shifty = 0) {
		this.gpu.alu(destReg, src1, src2,
			Arch.shiftToClipRect(shiftx, shifty), truthTable);
	}
	assign(destReg, src) {
		this.gpu.alu(destReg, src, src, Arch.CLIPRECT_NONE, Arch.TT_OR);
	}
	writeStrToScreen(str, x, y, bgcol, fgcol) {
		for (let i = 0; i < str.length; i++) {
			this.gpu.screen.writeChar(str[i], x + i, y, bgcol, fgcol);
		}
	}
};

class GpuModel {
	constructor() {
		this.vregs = [];
		for (let i = 0; i < Arch.VREG_NUM; i++) {
			this.vregs.push(new Vreg());
		}
		this.aluBuf = new Vreg();

		this.sharedRegs = [];
		for (let i = 0; i < Arch.SHARED_REG_NUM; i++) {
			this.sharedRegs.push(new Reg());
		}

		this.vrng = new VrngModel();

		this.touchOn = false;
		this.screenMaskLo = new Reg((1 << Arch.REG_BITS) - 1);
		this.screenMaskHi = new Reg((1 << Arch.REG_BITS) - 1);
		this.screen = new ScreenModel();
		this.palette = new Uint32Array(Arch.PALETTE_NUM);

		this.utils = new GpuUtils(this);

		this.debugOpCount = 0;
	}
	update() {
		this.vrng.update();
	}
	alu(destReg, src1, src2, clipRect, truthTable) {
		this.debugOpCount++;

		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			for (let j = 0; j < Arch.VREG_DIM.width; j++) {
				const pos = new Vector(j, i);
				const pix1pos = pos.add(clipRect.pos);
				let src1pix = src1.getPixSafe(pix1pos.x, pix1pos.y);
				if (!clipRect.dims.contains(pos))
					src1pix = 0;
				const src2pix = src2.getPix(j, i);
				const ttIndex = (src1pix << 1) | src2pix;
				const val = (truthTable >> ttIndex) & 1;
				this.aluBuf.setPix(j, i, val);
			}
		}
		this.vregs[destReg].assign(this.aluBuf);
	}
	writeToScreen(src, col) {
		this.debugOpCount++;

		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			const screenMask = (i < Arch.VREG_DIM.height / 2) ?
				this.screenMaskLo : this.screenMaskHi;
			const off = i % (Arch.VREG_DIM.height / 2);
			if (screenMask.getField(off, 1) == 0)
				continue;

			for (let j = 0; j < Arch.VREG_DIM.width; j++) {
				const doCol = src.getPix(j, i) == 1;
				if (!doCol)
					continue;

				this.screen.setPix(j, i, col);
			}
		}
	}
	loadRand(destReg) {
		this.debugOpCount++;

		this.vregs[destReg].fromRegArr(this.vrng.regs);
	}
};

module.exports = GpuModel;

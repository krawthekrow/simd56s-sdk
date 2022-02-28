import {Dimensions, Vector, Rect, Utils} from 'utils/Utils.js';

class Arch {
	static truncSigned(val, bits) {
		return val & ((1 << bits) - 1);
	}
	static shiftToClipRect(x, y, dim = Arch.VREG_DIM) {
		return new Rect(new Vector(-x, -y), dim);
	}
};

Arch.VREG_NUM = 32;
Arch.VREG_DIM = new Dimensions(56, 56);

Arch.REG_BITS = 29;

Arch.CLIPRECT_W_OFF = 0;
Arch.CLIPRECT_W_BITS = 6;
Arch.CLIPRECT_H_OFF = 6;
Arch.CLIPRECT_H_BITS = 6;
Arch.CLIPRECT_X_OFF = 12;
Arch.CLIPRECT_X_BITS = 7;
Arch.CLIPRECT_Y_OFF = 19;
Arch.CLIPRECT_Y_BITS = 7;

Arch.SHARED_REG_NUM = 32;

Arch.VRNG_CORES = 4;

Arch.PALETTE_NUM = 32;

Arch.CLIPRECT_NONE = new Rect(new Vector(0, 0), Arch.VREG_DIM);

Arch.TT_NOTA = 0b0011;
Arch.TT_XNOR = 0b1001;
Arch.TT_XOR = 0b0110;
Arch.TT_OR = 0b1110;
Arch.TT_AND = 0b1000;
Arch.TT_NAND = 0b0001;
Arch.TT_AANDNOTB = 0b0100;

Arch.CHAR_W = 4;
Arch.CHAR_H = 6;

class Vreg {
	constructor() {
		this.dataEven = new Uint32Array(Arch.VREG_DIM.width);
		this.dataOdd = new Uint32Array(Arch.VREG_DIM.width);
	}
	getPixSafe(x, y) {
		if (!Arch.VREG_DIM.contains(new Vector(x, y)))
			return 0;
		return this.getPix(x, y);
	}
	getPix(x, y) {
		const off = x >> 1;
		const data = ((x & 1) == 0) ? this.dataEven : this.dataOdd;
		return (data[y] >> off) & 1;
	}
	setPix(x, y, val) {
		const off = x >> 1;
		const data = ((x & 1) == 0) ? this.dataEven : this.dataOdd;
		data[y] &= ~(1 << off);
		data[y] |= val << off;
	}
	assign(ovreg) {
		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			for (let j = 0; j < Arch.VREG_DIM.width; j++) {
				this.setPix(j, i, ovreg.getPix(j, i));
			}
		}
	}
	fromRegArr(regArr) {
		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			this.dataEven[i] = regArr[i * 2].data;
			this.dataOdd[i] = regArr[i * 2 + 1].data;
		}
	}
};

class Reg {
	constructor(data = 0) {
		this.data = data;
	}
	getField(off, bits) {
		return (this.data >> off) & ((1 << bits) - 1);
	}
	getFieldSigned(off, bits) {
		const val = getField(off, bits);
		const positive = (val & (1 << (bits - 1)) == 0);
	}
	setField(off, bits, val) {
		console.assert(val < (1 << bits) && val >= -(1 << (bits - 1)));
		this.data &= ~(((1 << bits) - 1) << off);
		this.data |= (val & (1 << bits)) << off;
	}
	assign(oreg) {
		this.data = oreg.data;
	}
	toRect() {
		return new Rect(
			new Vector(
				this.getFieldSigned(CLIPRECT_X_OFF, CLIPRECT_X_BITS),
				this.getFieldSigned(CLIPRECT_Y_OFF, CLIPRECT_Y_BITS)
			),
			new Dimensions(
				this.getField(CLIPRECT_W_OFF, CLIPRECT_W_BITS),
				this.getField(CLIPRECT_H_OFF, CLIPRECT_H_BITS)
			)
		);
	}
	fromRect(r) {
		this.setField(CLIPRECT_X_OFF, CLIPRECT_X_BITS, r.x);
		this.setField(CLIPRECT_Y_OFF, CLIPRECT_Y_BITS, r.y);
		this.setField(CLIPRECT_W_OFF, CLIPRECT_W_BITS, r.width);
		this.setField(CLIPRECT_H_OFF, CLIPRECT_H_BITS, r.height);
	}
	rand() {
		this.data = Utils.randInt(1 << Arch.REG_BITS);
	}
};

module.exports = {
	Arch: Arch,
	Vreg: Vreg,
	Reg: Reg
};

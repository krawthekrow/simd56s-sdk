import {Dimensions, Vector, Rect, Utils} from 'util/Utils.js';

class Arch {
	static truncSigned(val, bits) {
		return val & ((1 << bits) - 1);
	}
	static shiftToClipRect(x, y, dim = Arch.VREG_DIM) {
		return new Rect(new Vector(-x, -y), dim);
	}
};

Arch.VREG_NUM = 64;
Arch.VREG_DIM = new Dimensions(56, 56);

Arch.REG_BITS = 29;

Arch.VRNG_CORES = 4;

Arch.PALETTE_NUM = 32;

Arch.CLIPRECT_NONE = new Rect(new Vector(0, 0), Arch.VREG_DIM);

Arch.CHAR_W = 4;
Arch.CHAR_H = 6;

class BoolReg {
	constructor(data = false) {
		this.data = data;
	}
};

class ColorReg {
	constructor(data = 0x000000) {
		this.data = data;
	}
};

class Vreg {
	constructor() {
		this.dataEven = new Uint32Array(Arch.VREG_DIM.width);
		this.dataOdd = new Uint32Array(Arch.VREG_DIM.width);
	}
	getPixSafe(x, y) {
		if (!Arch.VREG_DIM.contains(new Vector(x, y)))
			return false;
		return this.getPix(x, y);
	}
	getPix(x, y) {
		const off = x >> 1;
		const data = ((x & 1) == 0) ? this.dataEven : this.dataOdd;
		return ((data[y] >> off) & 1) == 1;
	}
	setPix(x, y, val) {
		const off = x >> 1;
		const data = ((x & 1) == 0) ? this.dataEven : this.dataOdd;
		data[y] &= ~(1 << off);
		data[y] |= (val ? 1 : 0) << off;
	}
	forEach(f) {
		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			for (let j = 0; j < Arch.VREG_DIM.width; j++) {
				f(j, i, this.getPix(j, i));
			}
		}
	}
	assign(ovreg) {
		ovreg.forEach((x, y, val) => {
			this.setPix(x, y, val);
		});
	}
	fromRegArr(regArr) {
		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			this.dataEven[i] = regArr[i * 2].data;
			this.dataOdd[i] = regArr[i * 2 + 1].data;
		}
	}
	toGridString() {
		let s = '';
		for (let i = 0; i < Arch.VREG_DIM.height; i++) {
			for (let j = 0; j < Arch.VREG_DIM.width; j++) {
				const x = this.getPix(j, i);
				s += x ? '#' : '.';
			}
			s += '\n';
		}
		return s;
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
	rand() {
		this.data = Utils.randInt(1 << Arch.REG_BITS);
	}
};

export {
	Arch,
	Vreg, Reg,
	BoolReg, ColorReg,
};

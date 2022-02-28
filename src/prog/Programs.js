import {Arch} from 'sim/Arch.js';

class Programs {
};
Programs.gol = (gpu) => {
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[0], Arch.TT_AND, 1, 1);

	gpu.utils.aluShift(3, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, 0, 1);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, 0, 1);

	gpu.utils.aluShift(5, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, -1, 1);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, -1, 1);
	gpu.utils.aluShift(3, gpu.vregs[5], gpu.vregs[3], Arch.TT_XOR);

	gpu.utils.aluShift(5, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, -1, 0);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, -1, 0);
	gpu.utils.aluShift(4, gpu.vregs[5], gpu.vregs[3], Arch.TT_AND);
	gpu.utils.aluShift(3, gpu.vregs[5], gpu.vregs[3], Arch.TT_XOR);

	gpu.utils.aluShift(5, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, -1, -1);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, -1, -1);
	gpu.utils.aluShift(6, gpu.vregs[5], gpu.vregs[3], Arch.TT_AND);
	gpu.utils.aluShift(3, gpu.vregs[5], gpu.vregs[3], Arch.TT_XOR);
	gpu.utils.aluShift(4, gpu.vregs[4], gpu.vregs[6], Arch.TT_OR);

	gpu.utils.aluShift(5, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, 0, -1);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, 0, -1);
	gpu.utils.aluShift(6, gpu.vregs[5], gpu.vregs[3], Arch.TT_AND);
	gpu.utils.aluShift(3, gpu.vregs[5], gpu.vregs[3], Arch.TT_XOR);
	gpu.utils.aluShift(4, gpu.vregs[4], gpu.vregs[6], Arch.TT_OR);

	gpu.utils.aluShift(5, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, 1, -1);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, 1, -1);
	gpu.utils.aluShift(6, gpu.vregs[5], gpu.vregs[3], Arch.TT_AND);
	gpu.utils.aluShift(3, gpu.vregs[5], gpu.vregs[3], Arch.TT_XOR);
	gpu.utils.aluShift(4, gpu.vregs[4], gpu.vregs[6], Arch.TT_OR);

	gpu.utils.aluShift(5, gpu.vregs[1], gpu.vregs[2], Arch.TT_AND, 1, 0);
	gpu.utils.aluShift(2, gpu.vregs[1], gpu.vregs[2], Arch.TT_XOR, 1, 0);
	gpu.utils.aluShift(6, gpu.vregs[5], gpu.vregs[3], Arch.TT_AND);
	gpu.utils.aluShift(3, gpu.vregs[5], gpu.vregs[3], Arch.TT_XOR);
	gpu.utils.aluShift(4, gpu.vregs[4], gpu.vregs[6], Arch.TT_OR);

	gpu.utils.aluShift(5, gpu.vregs[3], gpu.vregs[4], Arch.TT_AANDNOTB);
	gpu.utils.aluShift(5, gpu.vregs[5], gpu.vregs[1], Arch.TT_AND);
	gpu.utils.aluShift(6, gpu.vregs[2], gpu.vregs[3], Arch.TT_AND);
	gpu.utils.aluShift(6, gpu.vregs[6], gpu.vregs[4], Arch.TT_AANDNOTB);
	gpu.utils.aluShift(1, gpu.vregs[5], gpu.vregs[6], Arch.TT_OR);

	gpu.writeToScreen(gpu.vregs[0], gpu.palette[0]);
	gpu.writeToScreen(gpu.vregs[1], gpu.palette[1]);
};

module.exports = Programs;

import {Utils} from 'utils/Utils.js';
import {Arch} from 'sim/Arch.js';

class LineData {
	constructor(line, lineIndex, index, val) {
		this.line = line;
		this.lineIndex = lineIndex;
		this.index = index;
		this.val = val;
	}
};

class LineProcessor {
	constructor(src) {
		this.src = src;
		this.unescaped = '';
		// indexed by unescaped
		this.escapedNewlines = [];
		// indexed by src
		this.srcNewlines = [];

		for (let i = 0; i < this.src.length; i++) {
			if (i + 2 <= this.src.length &&
					this.src.substr(i, 2) == '\\\n') {
				this.escapedNewlines.push(this.unescaped.length);
				this.srcNewlines.push(i + 1);
				i++; // skip an extra char
				continue;
			}
			if (this.src[i] == '\n') {
				this.srcNewlines.push(i);
			}
			this.unescaped += this.src[i];
		}
	}
	// index should be an indexed into the unescaped string
	getLineData(index) {
		const escapedNewlines =
			Utils.upperBound(this.escapedNewlines, index);
		const srcIndex = index + escapedNewlines * 2;
		const line =
			Utils.lowerBound(this.srcNewlines, srcIndex);
		const lineStart = (line == 0)
			? 0 : (this.srcNewlines[line - 1] + 1);
		const lineEnd = (line == this.srcNewlines.length)
			? this.src.length : this.srcNewlines[line];
		const lineIndex = srcIndex - lineStart;
		const val = this.src.substring(lineStart, lineEnd);
		return new LineData(line, lineIndex, srcIndex, val);
	}
};

class Location {
	constructor(file, index, innerLoc = null) {
		this.file = file;
		this.index = index;
		this.innerLoc = innerLoc;
	}
	clone() {
		return new Location(this.file, this.index, this.innerLoc);
	}
};

class Token {
	constructor(type, val, loc) {
		this.type = type;
		this.val = val;
		this.loc = loc;
	}
	isNewline() {
		return this.type == Token.TYPE_NEWLINE;
	}
	isNoWsLparen() {
		return this.type == Token.TYPE_LPAREN;
	}
	isSym() {
		return this.type == Token.TYPE_SYM;
	}
	isPunct(val) {
		return this.type == Token.TYPE_PUNCT && this.val == val;
	}
	isLparen() {
		return this.isNoWsLparen() || this.isPunct('(');
	}
	isRparen() {
		return this.isPunct(')');
	}
	isIdent() {
		return this.type == Token.TYPE_SYM &&
			Token.REGEX_NOTNUM.test(this.val[0]);
	}
	isConstStr() {
		return this.type == Token.TYPE_CONSTSTR;
	}
	// assumes token is simple, i.e. val is immutable
	cloneToLoc(loc) {
		const newLoc = loc.clone();
		newLoc.innerLoc = this.loc;
		return new Token(this.type, this.val, newLoc);
	};
	getFingerprint() {
		switch (this.type) {
		case Token.TYPE_NEWLINE:
			return '\\n';
		case Token.TYPE_LPAREN:
		case Token.TYPE_SYM:
		case Token.TYPE_PUNCT:
			return this.val;
		case Token.TYPE_TOKENS:
			let fingerprint = '';
			for (let i = 0; i < this.val.length; i++) {
				if (i != 0)
					fingerprint += ' ';
				fingerprint += this.val[i].getFingerprint();
			}
			return fingerprint;
		case Token.TYPE_IMM:
			return `0x${this.val.toString(16)}`;
		case Token.TYPE_VREG:
			return `V${this.val.toString()}`;
		case Token.TYPE_CONSTSTR:
			return `"${this.val}"`;
		default:
			throw new Error('unrecognized token type');
		}
	}
	static stringify(arr) {
		let str = '';
		let init = true;
		for(const tok of arr) {
			if (tok.type == Token.TYPE_NEWLINE) {
				str += '\n';
				continue;
			}
			if (init)
				init = false;
			else
				str += ' ';
			str += tok.getFingerprint();
		}
		return str;
	}
};

Token.TYPE_NEWLINE = 0;
Token.TYPE_PUNCT = 1;
// lparen is a '(' not immediately preceded by whitespace
Token.TYPE_LPAREN = 2;
Token.TYPE_SYM = 3;
Token.TYPE_PARAMS = 4;
Token.TYPE_TOKENS = 5;
Token.TYPE_INST = 6;
Token.TYPE_IMM = 7;
Token.TYPE_VREG = 8;
Token.TYPE_REG = 9;
Token.TYPE_CONSTSTR = 10;

Token.REGEX_NOTNUM = /^[^0-9]$/;

class LexerState {
	constructor(loc, tokIndex) {
		this.loc = loc;
		this.tokIndex = tokIndex;
	}
};

class ParseError {
	constructor(msg, type, loc) {
		this.msg = msg;
		this.type = type;
		this.loc = loc;
	}
	getTypeAsString() {
		switch(this.type) {
		case ParseError.TYPE_ERROR:
			return 'error';
			break;
		case ParseError.TYPE_WARNING:
			return 'warning';
			break;
		case ParseError.TYPE_DEBUG:
			return 'debug';
			break;
		default:
			throw new Error('unrecognized parse error type');
		}
	}
};
ParseError.TYPE_ERROR = 0;
ParseError.TYPE_WARNING = 1;
ParseError.TYPE_DEBUG = 2;

class LexerRegexSpec {
	constructor(regexSpec, tokenType = null) {
		// the lastIndex of this must be set before use
		this.regex = new RegExp(regexSpec, 'y');
		this.tokenType = tokenType;
	}
};

class Lexer {
	constructor(file, str) {
		this.loc = new Location(file, 0);
		this.str = str;
		this.toks = [];
		this.errors = [];
	}
	get index() {
		return this.loc.index;
	}
	set index(index) {
		this.loc.index = index;
	}
	pushError(msg, type = ParseError.TYPE_ERROR) {
		this.errors.push(new ParseError(msg, type, this.loc.clone()));
	}
	pushTok(type, val) {
		this.toks.push(new Token(type, val, this.loc.clone()));
	}
	lexRegex(regex, type) {
		regex.lastIndex = this.index;
		const match = regex.exec(this.str);
		if (match == null)
			return false;
		if (match.length != 2)
			throw new Error('lexer regex match should have length 2');
		if (type != null)
			this.pushTok(type, match[1]);
		this.index += match[0].length;
		return true;
	}
	lexEof() {
		// treat end of file like a new line
		return this.lexRegex(Lexer.EofRegex, Token.TYPE_NEWLINE);
	}
	lexSpec(spec) {
		return this.lexRegex(spec.regex, spec.tokenType);
	}
	lexChunk() {
		for (;;) {
			if (this.lexSpec(Lexer.EOF_SPEC))
				break;
			let foundMatch = false;
			for (const spec of Lexer.REGEX_SPECS) {
				foundMatch = foundMatch || this.lexSpec(spec);
			}
			if (!foundMatch) {
				if (this.str[this.index] == '\\')
					this.pushError(`'\\' must escape a new line`);
				else if (this.lexSpec(Lexer.BADCONSTSTR_SPEC))
					this.pushError('newline encountered when parsing constant string');
				else
					this.pushError(`unknown symbol '${this.str[this.index]}'`);
				this.index++;
				continue;
			}
		}
	}
};
Lexer.REGEX_SPECS = [
	new LexerRegexSpec('([(])', Token.TYPE_LPAREN),
	new LexerRegexSpec('(\\n)', Token.TYPE_NEWLINE),
	new LexerRegexSpec('([\\s]+)', null), // whitespace
	new LexerRegexSpec('(;[^\\n]*)', null), // comment
	new LexerRegexSpec('([0-9a-zA-Z_]+)', Token.TYPE_SYM),
	new LexerRegexSpec('"([^"\\n]*)"', Token.TYPE_CONSTSTR),
	new LexerRegexSpec('(<<|>>|[%\\[\\](),+\\-*\\/|&^])', Token.TYPE_PUNCT),
];
Lexer.EOF_SPEC = new LexerRegexSpec('()$', Token.TYPE_NEWLINE);
Lexer.BADCONSTSTR_SPEC = new LexerRegexSpec('"([^"\\n]*)', null);

class Macro {
	constructor(params, toks) {
		this.params = params;
		this.toks = toks;
	}
};

class AssignExprParser {
	constructor(toks, errors) {
		this.toks = toks;
		this.index = 0;
		this.errors = errors;
	}
};

class PreprocFrame {
	constructor(file, index) {
		this.file = file;
		this.index = index;
	}
}

class Preprocessor {
	constructor(srcs, startFile) {
		this.frame = new PreprocFrame(startFile, 0);
		this.srcs = srcs;
		this.stack = [];
		this.toksOut = [];
		this.errors = [];

		this.defineTbl = {};
	}
	get toks() {
		return this.srcs[this.frame.file];
	}
	get index() {
		return this.frame.index;
	}
	set index(val) {
		this.frame.index = val;
	}
	pushError(msg, index = this.index, type = ParseError.TYPE_ERROR) {
		if (index == this.toks.length)
			index--;
		const loc = this.toks[index].loc.clone();
		this.errors.push(new ParseError(msg, type, loc));
	}
	pushWarning(msg, index = this.index) {
		this.pushError(msg, index, ParseError.TYPE_WARNING);
	}
	pushDebug(msg, index = this.index) {
		this.pushError(msg, index, ParseError.TYPE_DEBUG);
	}
	isStartOfLine() {
		return this.index == 0 ||
			this.toks[this.index - 1].isNewline();
	}
	hasToks(num) {
		return this.index + num <= this.toks.length;
	}
	getNextTok(off = 0) {
		const index = this.index + off;
		if (index >= this.toks.length)
			throw new Error('index out of bounds');
		return this.toks[index];
	}
	skipLine() {
		while (!this.getNextTok().isNewline()) {
			this.index++;
		}
		this.index++;
	}
	parseCmd() {
		if (!this.isStartOfLine())
			return false;
		if (!this.hasToks(2))
			return false;
		if (!this.getNextTok().isPunct('%'))
			return false;
		const cmdTok = this.getNextTok(1);
		if (!cmdTok.isIdent())
			return false;
		switch (cmdTok.val) {
		case 'define':
			this.index += 2;
			this.parseDefine();
			break;
		case 'include':
			this.index += 2;
			this.parseInclude();
			break;
		default:
			return false;
		}
		return true;
	}
	parseNewline() {
		if (!this.hasToks(1))
			return false;
		if (!this.getNextTok().isNewline())
			return false;
		this.index++;
		return true;
	}
	parseCmds() {
		while (this.index < this.toks.length) {
			let foundMatch = false;
			foundMatch = foundMatch || this.parseCmd();
			foundMatch = foundMatch || this.parseNewline();

			if (!foundMatch)
				break;
		}
	}
	parseDefineParams() {
		const lparenTok = this.getNextTok();
		if (!lparenTok.isNoWsLparen())
			return null;
		this.index++;

		const rparenTok = this.getNextTok();
		if (rparenTok.isRparen()) {
			this.index++;
			return [];
		}

		const params = [];
		while (true) {
			const identTok = this.getNextTok();
			if (identTok.isNewline()) {
				this.pushError('incomplete define params list');
				return params;
			}
			this.index++;
			if (identTok.isIdent()) {
				params.push(identTok.val);
			}
			else {
				this.pushError('expected identifier in define params list', this.index - 1);
				while (true) {
					const badTok = this.getNextTok();
					if (badTok.isPunct(','))
						break;
					if (badTok.isRparen())
						break;
					if (badTok.isNewline())
						return params;
					this.index++;
				}
			}

			const punctTok = this.getNextTok();
			if (punctTok.isNewline()) {
				this.pushError('incomplete define params list');
				return params;
			}
			this.index++;
			if (punctTok.isRparen())
				return params;
			if (!punctTok.isPunct(','))
				this.pushError('expected comma or close paren after identifier in define params list', this.index - 1);
		}
	}
	parseDefine() {
		const defKeyTok = this.getNextTok();
		if (!defKeyTok.isIdent()) {
			this.pushError('define should start with a valid identifier');
			this.skipLine();
			return;
		}
		this.index++;
		const defKey = defKeyTok.val;
		if (defKey in this.defineTbl)
			this.pushWarning(`redefining ${defKey}`, this.index - 1);
		const params = this.parseDefineParams();
		const defVal = [];

		while (true) {
			if (this.parseExpandDefine(defVal, false))
				continue;
			const nextTok = this.getNextTok();
			this.index++;
			if (nextTok.isNewline())
				break;
			defVal.push(nextTok);
		}

		this.defineTbl[defKey] = new Macro(params, defVal);
	}
	parseDefineArgList() {
		this.parseCmds();

		if (!this.hasToks(1) || !this.getNextTok().isLparen()) {
			this.pushError('expected lparen in define expansion');
			return [];
		}
		const origIndex = this.index;
		this.index++;

		let parenDepth = 0;
		let args = [];
		let arg = [];
		for (;;) {
			this.parseCmds();
			if (!this.hasToks(1)) {
				this.pushError('unmatched lparen', origIndex);
				return [];
			}
			if (this.parseExpandDefine(arg))
				continue;
			const nextTok = this.getNextTok();
			this.index++;
			if (nextTok.isPunct(',') && parenDepth == 0) {
				args.push(arg);
				arg = [];
				continue;
			}
			if (nextTok.isPunct('(')) {
				parenDepth++;
			}
			if (nextTok.isPunct(')')) {
				if (parenDepth == 0) {
					// X() has no arguments, but X(,) has two
					if (args.length != 0) {
						args.push(arg);
					}
					return args;
				}
				parenDepth--;
			}
			arg.push(nextTok);
		}
	}
	parseExpandDefine(toksOut = this.toksOut, allowNewline = true) {
		const keyTok = this.getNextTok();
		if (!keyTok.isIdent())
			return false;
		if (!(keyTok.val in this.defineTbl))
			return false;
		const keyIndex = this.index;
		this.index++;

		this.parseCmds();

		const def = this.defineTbl[keyTok.val];
		const argList = (def.params == null) ? []
			: this.parseDefineArgList();

		if (def.params != null && argList.length != def.params.length) {
			this.pushError(`incorrect number of arguments in define expansion -- expected ${def.params.length}, got ${argList.length}`, keyIndex);
			return true;
		}

		const toStartIndex = toksOut.length;
		for (let i = 0; i < def.toks.length; i++) {
			let foundParam = false;
			if (def.toks[i].isIdent()) {
				for (let j = 0; j < argList.length; j++) {
					if (def.toks[i].val == def.params[j]) {
						for (let k = 0; k < argList[j].length; k++) {
							toksOut.push(argList[j][k]);
						}
						foundParam = true;
						break;
					}
				}
			}
			if (!foundParam)
				toksOut.push(def.toks[i].cloneToLoc(keyTok.loc));
		}

		let debugParamsString = '';
		for (let i = 0; i < argList.length; i++) {
			if (i != 0)
				debugParamsString += ', ';
			for (let j = 0; j < argList[i].length; j++) {
				if (j != 0)
					debugParamsString += ' ';
				debugParamsString += argList[i][j].getFingerprint();
			}
		}
		let debugToString = '';
		for (let i = toStartIndex; i < toksOut.length; i++) {
			if (i != toStartIndex)
				debugToString += ' ';
			debugToString += toksOut[i].getFingerprint();
		}
		const debugString = `[macro expansion] ${keyTok.val}(${debugParamsString}) ==> ${debugToString}`;
		this.pushDebug(debugString, keyIndex);
		return true;
	}
	parseInclude() {
		const fileTok = this.getNextTok();
		if (!fileTok.isConstStr()) {
			this.pushError('include file should be specified as a constant string');
			this.skipLine();
			return;
		}
		const fileIndex = this.index;
		this.index++;
		if (!this.getNextTok().isNewline())
			this.pushWarning('extra tokens after include directive');
		this.skipLine();

		const file = fileTok.val;
		if (!(file in this.srcs))
			this.pushError(`unable to find file "${file}"`, fileIndex);
		this.stack.push(this.frame);
		this.frame = new PreprocFrame(file, 0);
	}
	parseChunk() {
		for (;;) {
			if (this.index > this.toks.length)
				throw new Error('index out of bounds');
			if (this.index == this.toks.length) {
				if (this.stack.length == 0)
					break;
				this.frame = this.stack.pop();
			}
			let foundMatch = false;
			foundMatch = foundMatch || this.parseCmd();
			foundMatch = foundMatch || this.parseExpandDefine();

			if (!foundMatch) {
				this.toksOut.push(this.toks[this.index]);
				this.index++;
			}
		}
	}
};

class ParserImmSpec {
	constructor(regex, base) {
		this.regex = regex;
		this.base = base;
	}
};

class Parser {
	constructor(toks) {
		this.toks = toks;
		this.toksOut = [];
		this.index = 0;
		this.errors = [];
	}
	makeTok(type, val, index = this.index) {
		const loc = this.toks[index].loc.clone();
		return new Token(type, val, loc);
	}
	pushTok(type, val, index = this.index) {
		this.toksOut.push(this.makeTok(type, val, index));
	}
	pushError(msg, index = this.index, type = ParseError.TYPE_ERROR) {
		if (index == this.toks.length)
			index--;
		const loc = this.toks[index].loc.clone();
		this.errors.push(new ParseError(msg, type, loc));
	}
	pushWarning(msg, index = this.index) {
		this.pushError(msg, index, ParseError.TYPE_WARNING);
	}
	pushDebug(msg, index = this.index) {
		this.pushError(msg, index, ParseError.TYPE_DEBUG);
	}
	parseNewline(emitWarning = false) {
		if (!this.hasToks(1))
			return false;
		if (!this.getNextTok().isNewline())
			return false;
		if (emitWarning)
			this.pushWarning('unexpected newline');
		this.index++;
		return true;
	}
	parseImm(toksOut = this.toksOut) {
		if (!this.hasToks(1))
			return false;
		const tok = this.getNextTok();
		if (!tok.isSym())
			return false;
		for (const spec of Parser.IMM_SPEC.length) {
			const match = tok.val.match(spec.regex);
			if (match == null)
				continue;
			if (match.length != 3)
				throw new Error('immediate match should have length 3');
			let val = parseInt(match[2], spec.base);
			if (isNaN(val))
				throw new Error('failed to parse immediate');
			if (match[1] == '-')
				val = -val;
			toksOut.push(this.makeTok(Token.TYPE_IMM, val));
			this.index++;
			return true;
		}
		return false;
	}
	parseVreg(toksOut = this.toksOut) {
		if (!this.hasToks(1))
			return false;
		const tok = this.getNextTok();
		if (!tok.isIdent())
			return false;
		const match = tok.val.match(Parser.REGEX_VREG);
		if (match == null)
			return false;
		if (match.length != 2)
			throw new Error('register match should have length 2');
		const val = parseInt(match[1]);
		if (isNaN(val))
			throw new Error('failed to parse vreg');
		toksOut.push(this.makeTok(Token.TYPE_VREG, val));
		this.index++;
		return true;
	}
	parseInst() {
		if (!this.hasToks(1))
			return false;
		const instTok = this.getNextTok();
		if (!instTok.isIdent())
			return false;
		if (!(instTok.val in Parser.INST_SPECS))
			return false;
		const spec = Parser.INST_SPECS[instTok];
		const instIndex = this.index;
		this.index++;

		const instArgs = [];
		for (let i = 0; i < spec.length; i++) {
			this.parseNewline(true);

			let success;
			switch (spec) {
			case Token.TYPE_IMM:
				if (!this.parseImm(instArgs)) {
					this.pushError(`expected immediate for parameter ${i} of instruction ${instTok.val}`, instIndex);
					return true;
				}
				break;
			case Token.TYPE_VREG:
				if (!this.parseVreg(instArgs)) {
					this.pushError(`expected register for parameter ${i} of instruction ${instTok.val}`, instIndex);
					return true;
				}
				break;
			}
			if (!success) {
				break;
			}
		}
		this.pushTok(Token.TYPE_INST, instArgs, instIndex);
		return true;
	}
	parseChunk() {
		while (this.index < this.toks.length) {
			let foundMatch = false;
			foundMatch = foundMatch || this.parseNewline();
			foundMatch = foundMatch || this.parseInst();

			if (!foundMatch) {
				this.pushError(`unexpected token ${this.toks[this.index].getFingerprint()}`);
				this.index++;
			}
		}
	}
};
Parser.INST_SPECS = {
	'galu': [
		Token.TYPE_IMM, // truth table
		Token.TYPE_IMM, // clip rect x
		Token.TYPE_IMM, // clip rect y
		Token.TYPE_IMM, // clip rect w
		Token.TYPE_IMM, // clip rect h
		Token.TYPE_VREG, // dest
		Token.TYPE_VREG, // src1
		Token.TYPE_VREG, // src2
	],
	'galur': [
		Token.TYPE_IMM, // truth table
		Token.TYPE_REG, // clip rect
		Token.TYPE_VREG, // dest
		Token.TYPE_VREG, // src1
		Token.TYPE_VREG, // src2
	],
};
Parser.IMM_SPEC = [
	new ParserImmSpec(/^(-?)0b([0-9]+)$/, 2),
	new ParserImmSpec(/^(-?)0x([0-9]+)$/, 16),
	new ParserImmSpec(/^(-?)([0-9]+)$/, 10),
];
Parser.REGEX_VREG = /^[vV]([0-9]+)$/;

class StdlibGenerator {
	static genStdlib() {
		let gopsSrc = '';
		gopsSrc += `%define CR_NONE 0 0 0 0\n`;
		gopsSrc += `%define VREG_WIDTH ${Arch.VREG_DIM.width}\n`;
		gopsSrc += `%define VREG_HEIGHT ${Arch.VREG_DIM.height}\n`;
		gopsSrc += `\n`;
		for (const op in StdlibGenerator.GALU_INSTS) {
			const truthTable = StdlibGenerator.GALU_INSTS[op];
			const ttStr = truthTable.toString(2).padStart(4, '0');
			gopsSrc += `%define g${op}c galu 0b${ttStr}\n`;
			gopsSrc += `%define g${op}s(x, y) g${op}c x y VREG_WIDTH VREG_HEIGHT\n`;
			gopsSrc += `%define g${op} g${op}c CR_NONE\n`;
			gopsSrc += `\n`;
		}
		return {
			'gops.s': gopsSrc
		};
	}
};
StdlibGenerator.GALU_INSTS = {
	'and': 0b1000,
	'nand': 0b0111,
	'or': 0b1110,
	'nor': 0b0001,
	'xor': 0b0110,
	'xnor': 0b1001,
	'sub': 0b0100,
	'nota': 0b1100,
};

class Assembler {
	static assemble(userSrcs, startFile) {
		const stdlibSrcs = StdlibGenerator.genStdlib();
		let srcs = {};
		let initErrors = [];
		for (const file in stdlibSrcs) {
			srcs[file] = stdlibSrcs[file];
		}
		for (const file in userSrcs) {
			if (file in srcs) {
				initErrors.push(new ParseError(
					`redefining source file '${file}'`,
					ParseError.TYPE_WARNING,
					new Location(file, 0)));
			}
			srcs[file] = userSrcs[file];
		}

		let lineProcs = {};
		let srcToks = {};
		let lexers = {};
		for (const file in srcs) {
			const src = srcs[file];
			const lineProc = new LineProcessor(src);
			const lexer = new Lexer(file, lineProc.unescaped);
			lexer.lexChunk();
			lexers[file] = lexer;
			lineProcs[file] = lineProc;
			srcToks[file] = lexer.toks;
		}
		const preprocessor = new Preprocessor(srcToks, startFile);
		preprocessor.parseChunk();

		let foundErrors = false;
		for (const err of initErrors) {
			Assembler.printError(err, lineProcs[err.loc.file]);
			if (err.type == ParseError.TYPE_ERROR)
				foundErrors = true;
		}
		for (const file in lexers) {
			const lexer = lexers[file];
			for (const err of lexer.errors) {
				Assembler.printError(err, lineProcs[file]);
				if (err.type == ParseError.TYPE_ERROR)
					foundErrors = true;
			}
		}
		for (const err of preprocessor.errors) {
			Assembler.printError(err, lineProcs[err.loc.file]);
			if (err.type == ParseError.TYPE_ERROR)
				foundErrors = true;
		}

		if (!foundErrors) {
			Assembler.printToks(preprocessor.toksOut);
		}
	}
	static printError(err, lineProcessor) {
		const lineData = lineProcessor.getLineData(err.loc.index);
		const fingerprint =
			`${err.loc.file}:${lineData.line + 1}:${lineData.lineIndex}`;
		const errTypeAsString = err.getTypeAsString();
		let errStr = '';
		errStr += `[${errTypeAsString}] ${fingerprint}: ${err.msg}\n`;
		errStr += `${lineData.val}\n`;
		errStr += `${''.padStart(lineData.lineIndex, '-')}^\n`;
		console.log(errStr);
	}
	static printToks(toks) {
		let debugStr = '';
		for (let i = 0; i < toks.length; i++) {
			debugStr += `${toks[i].getFingerprint()}\n`;
		}
		console.log(debugStr);
	}
};

module.exports = Assembler;

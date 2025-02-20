import Stream from "buffer-pipe";
/**
 * This code is an adaptation over https://github.com/warp-contracts/warp-wasm-json-toolkit/blob/main/wasm2json.js.
 *
 * License: MPL-2.0
 */
import leb from "leb128";
import { OP_IMMEDIATES } from "./immediates.js";

const wasm2json = (buf, filter) => {
	const stream = new Stream(buf);
	return wasm2json.parse(stream, filter);
};
// https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#language-types
// All types are distinguished by a negative varint7 values that is the first
// byte of their encoding (representing a type constructor)
const LANGUAGE_TYPES = (wasm2json.LANGUAGE_TYPES = {
	127: "i32",
	126: "i64",
	125: "f32",
	124: "f64",
	112: "anyFunc",
	96: "func",
	64: "block_type",
});

// https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#external_kind
// A single-byte unsigned integer indicating the kind of definition being imported or defined:
const EXTERNAL_KIND = (wasm2json.EXTERNAL_KIND = {
	0: "function",
	1: "table",
	2: "memory",
	3: "global",
});

wasm2json.parsePreramble = (stream) => {
	const obj = {};
	obj.name = "preramble";
	obj.magic = [...stream.read(4)];
	obj.version = [...stream.read(4)];
	return obj;
};

wasm2json.parseSectionHeader = (stream) => {
	const id = stream.read(1)[0];
	const size = leb.unsigned.readBn(stream).toNumber();
	return {
		id,
		name: SECTION_IDS[id],
		size,
	};
};

export const TRUNCATION_CODES = {
	0x0: "i32.trunc_sat_f32_s",
	0x1: "i32.trunc_sat_f32_u",
	0x2: "i32.trunc_sat_f64_s",
	0x3: "i32.trunc_sat_f64_u",
	0x4: "i64.trunc_sat_f32_s",
	0x5: "i64.trunc_sat_f32_u",
	0x6: "i64.trunc_sat_f64_s",
	0x7: "i64.trunc_sat_f64_u",
	0x8: "trunc_memory.init",
	0x9: "trunc_data.drop",
	0xA: "trunc_memory.copy",
	0xB: "trunc_memory.fill",
	0xC: "trunc_table.init",
	0xD: "trunc_elem.drop",
	0xE: "trunc_table.copy",
	0xF: "trunc_table.grow",
	0x10: "trunc_table.size",
	0x11: "trunc_table.fill",
};

const OPCODES = (wasm2json.OPCODES = {
	// flow control
	0: "unreachable",
	1: "nop",
	2: "block",
	3: "loop",
	4: "if",
	5: "else",
	11: "end",
	12: "br",
	13: "br_if",
	14: "br_table",
	15: "return",

	// calls
	16: "call",
	17: "call_indirect",

	// Parametric operators
	26: "drop",
	27: "select",

	// Varibale access
	32: "get_local",
	33: "set_local",
	34: "tee_local",
	35: "get_global",
	36: "set_global",

	// Memory-related operators
	40: "i32.load",
	41: "i64.load",
	42: "f32.load",
	43: "f64.load",
	44: "i32.load8_s",
	45: "i32.load8_u",
	46: "i32.load16_s",
	47: "i32.load16_u",
	48: "i64.load8_s",
	49: "i64.load8_u",
	50: "i64.load16_s",
	51: "i64.load16_u",
	52: "i64.load32_s",
	53: "i64.load32_u",
	54: "i32.store",
	55: "i64.store",
	56: "f32.store",
	57: "f64.store",
	58: "i32.store8",
	59: "i32.store16",
	60: "i64.store8",
	61: "i64.store16",
	62: "i64.store32",
	63: "current_memory",
	64: "grow_memory",

	// Constants
	65: "i32.const",
	66: "i64.const",
	67: "f32.const",
	68: "f64.const",

	// Comparison operators
	69: "i32.eqz",
	70: "i32.eq",
	71: "i32.ne",
	72: "i32.lt_s",
	73: "i32.lt_u",
	74: "i32.gt_s",
	75: "i32.gt_u",
	76: "i32.le_s",
	77: "i32.le_u",
	78: "i32.ge_s",
	79: "i32.ge_u",
	80: "i64.eqz",
	81: "i64.eq",
	82: "i64.ne",
	83: "i64.lt_s",
	84: "i64.lt_u",
	85: "i64.gt_s",
	86: "i64.gt_u",
	87: "i64.le_s",
	88: "i64.le_u",
	89: "i64.ge_s",
	90: "i64.ge_u",
	91: "f32.eq",
	92: "f32.ne",
	93: "f32.lt",
	94: "f32.gt",
	95: "f32.le",
	96: "f32.ge",
	97: "f64.eq",
	98: "f64.ne",
	99: "f64.lt",
	100: "f64.gt",
	101: "f64.le",
	102: "f64.ge",

	// Numeric operators
	103: "i32.clz",
	104: "i32.ctz",
	105: "i32.popcnt",
	106: "i32.add",
	107: "i32.sub",
	108: "i32.mul",
	109: "i32.div_s",
	110: "i32.div_u",
	111: "i32.rem_s",
	112: "i32.rem_u",
	113: "i32.and",
	114: "i32.or",
	115: "i32.xor",
	116: "i32.shl",
	117: "i32.shr_s",
	118: "i32.shr_u",
	119: "i32.rotl",
	120: "i32.rotr",
	121: "i64.clz",
	122: "i64.ctz",
	123: "i64.popcnt",
	124: "i64.add",
	125: "i64.sub",
	126: "i64.mul",
	127: "i64.div_s",
	128: "i64.div_u",
	129: "i64.rem_s",
	130: "i64.rem_u",
	131: "i64.and",
	132: "i64.or",
	133: "i64.xor",
	134: "i64.shl",
	135: "i64.shr_s",
	136: "i64.shr_u",
	137: "i64.rotl",
	138: "i64.rotr",
	139: "f32.abs",
	140: "f32.neg",
	141: "f32.ceil",
	142: "f32.floor",
	143: "f32.trunc",
	144: "f32.nearest",
	145: "f32.sqrt",
	146: "f32.add",
	147: "f32.sub",
	148: "f32.mul",
	149: "f32.div",
	150: "f32.min",
	151: "f32.max",
	152: "f32.copysign",
	153: "f64.abs",
	154: "f64.neg",
	155: "f64.ceil",
	156: "f64.floor",
	157: "f64.trunc",
	158: "f64.nearest",
	159: "f64.sqrt",
	160: "f64.add",
	161: "f64.sub",
	162: "f64.mul",
	163: "f64.div",
	164: "f64.min",
	165: "f64.max",
	166: "f64.copysign",

	// Conversions
	167: "i32.wrap/i64",
	168: "i32.trunc_s/f32",
	169: "i32.trunc_u/f32",
	170: "i32.trunc_s/f64",
	171: "i32.trunc_u/f64",
	172: "i64.extend_s/i32",
	173: "i64.extend_u/i32",
	174: "i64.trunc_s/f32",
	175: "i64.trunc_u/f32",
	176: "i64.trunc_s/f64",
	177: "i64.trunc_u/f64",
	178: "f32.convert_s/i32",
	179: "f32.convert_u/i32",
	180: "f32.convert_s/i64",
	181: "f32.convert_u/i64",
	182: "f32.demote/f64",
	183: "f64.convert_s/i32",
	184: "f64.convert_u/i32",
	185: "f64.convert_s/i64",
	186: "f64.convert_u/i64",
	187: "f64.promote/f32",

	// Reinterpretations
	188: "i32.reinterpret/f32",
	189: "i64.reinterpret/f64",
	190: "f32.reinterpret/i32",
	191: "f64.reinterpret/i64",

	// Narrow-Width Integer Sign Extension
	192: "i32.extend8_s",
	193: "i32.extend16_s",
	194: "i64.extend8_s",
	195: "i64.extend16_s",
	196: "i64.extend32_s",

	// saturating truncation instructions
	252: "truncation",
});

const SECTION_IDS = (wasm2json.SECTION_IDS = {
	0: "custom",
	1: "type",
	2: "import",
	3: "function",
	4: "table",
	5: "memory",
	6: "global",
	7: "export",
	8: "start",
	9: "element",
	10: "code",
	11: "data",
	12: "datacount",
});

wasm2json.immediataryParsers = {
	varuint1: (stream) => {
		const int1 = stream.read(1)[0];
		return int1;
	},
	varuint32: (stream) => {
		const int32 = leb.unsigned.read(stream);
		return int32;
	},
	varint32: (stream) => {
		const int32 = leb.signed.read(stream);
		return int32;
	},
	varint64: (stream) => {
		const int64 = leb.signed.read(stream);
		return int64;
	},
	uint32: (stream) => {
		return [...stream.read(4)];
	},
	uint64: (stream) => {
		return [...stream.read(8)];
	},
	block_type: (stream) => {
		const type = stream.read(1)[0];
		return LANGUAGE_TYPES[type];
	},
	br_table: (stream) => {
		const json = {
			targets: [],
		};
		const num = leb.unsigned.readBn(stream).toNumber();
		for (let i = 0; i < num; i++) {
			const target = leb.unsigned.readBn(stream).toNumber();
			json.targets.push(target);
		}
		json.defaultTarget = leb.unsigned.readBn(stream).toNumber();
		return json;
	},
	call_indirect: (stream) => {
		const json = {};
		json.index = leb.unsigned.readBn(stream).toNumber();
		json.reserved = stream.read(1)[0];
		return json;
	},
	memory_immediate: (stream) => {
		const json = {};
		json.flags = leb.unsigned.readBn(stream).toNumber();
		json.offset = leb.unsigned.readBn(stream).toNumber();
		return json;
	},
};

wasm2json.typeParsers = {
	function: (stream) => {
		return leb.unsigned.readBn(stream).toNumber();
	},
	table: (stream) => {
		const entry = {};
		const type = stream.read(1)[0]; // read single byte
		entry.elementType = LANGUAGE_TYPES[type];
		entry.limits = wasm2json.typeParsers.memory(stream);
		return entry;
	},
	/**
	 * parses a [`global_type`](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#global_type)
	 * @param {Stream} stream
	 * @return {Object}
	 */
	global: (stream) => {
		const global = {};
		const type = stream.read(1)[0];
		global.contentType = LANGUAGE_TYPES[type];
		global.mutability = stream.read(1)[0];
		return global;
	},
	/**
	 * Parses a [resizable_limits](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#resizable_limits)
	 * @param {Stream} stream
	 * return {Object}
	 */
	memory: (stream) => {
		const limits = {};
		limits.flags = leb.unsigned.readBn(stream).toNumber();
		limits.intial = leb.unsigned.readBn(stream).toNumber();
		if (limits.flags === 1) {
			limits.maximum = leb.unsigned.readBn(stream).toNumber();
		}
		return limits;
	},
	/**
	 * Parses a [init_expr](https://github.com/WebAssembly/design/blob/master/BinaryEncoding.md#resizable_limits)
	 * The encoding of an initializer expression is the normal encoding of the
	 * expression followed by the end opcode as a delimiter.
	 */
	initExpr: (stream) => {
		const op = wasm2json.parseOp(stream);
		stream.read(1); // skip the `end`
		return op;
	},
};

const sectionParsers = (wasm2json.sectionParsers = {
	custom: (stream, header) => {
		const json = {
			name: "custom",
		};
		const section = new Stream(stream.read(header.size));
		const nameLen = leb.unsigned.readBn(section).toNumber();
		const name = section.read(nameLen);
		json.sectionName = Buffer.from(name).toString();
		json.payload = [...section.buffer];
		return json;
	},
	type: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "type",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			let type = stream.read(1)[0];
			const entry = {
				form: LANGUAGE_TYPES[type],
				params: [],
			};

			const paramCount = leb.unsigned.readBn(stream).toNumber();

			// parse the entries
			for (let q = 0; q < paramCount; q++) {
				const type = stream.read(1)[0];
				entry.params.push(LANGUAGE_TYPES[type]);
			}
			const numOfReturns = leb.unsigned.readBn(stream).toNumber();
			if (numOfReturns) {
				type = stream.read(1)[0];
				entry.return_type = LANGUAGE_TYPES[type];
			}

			json.entries.push(entry);
		}
		return json;
	},
	import: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "import",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const entry = {};
			const moduleLen = leb.unsigned.readBn(stream).toNumber();
			entry.moduleStr = Buffer.from(stream.read(moduleLen)).toString();

			const fieldLen = leb.unsigned.readBn(stream).toNumber();
			entry.fieldStr = Buffer.from(stream.read(fieldLen)).toString();
			const kind = stream.read(1)[0]; // read single byte
			entry.kind = EXTERNAL_KIND[kind];
			entry.type = wasm2json.typeParsers[entry.kind](stream);

			json.entries.push(entry);
		}
		return json;
	},
	function: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "function",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const entry = leb.unsigned.readBn(stream).toNumber();
			json.entries.push(entry);
		}
		return json;
	},
	table: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "table",
			entries: [],
		};

		// parse table_type
		for (let i = 0; i < numberOfEntries; i++) {
			const entry = wasm2json.typeParsers.table(stream);
			json.entries.push(entry);
		}
		return json;
	},
	memory: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "memory",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const entry = wasm2json.typeParsers.memory(stream);
			json.entries.push(entry);
		}
		return json;
	},
	global: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "global",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const entry = {};
			entry.type = wasm2json.typeParsers.global(stream);
			entry.init = wasm2json.typeParsers.initExpr(stream);

			json.entries.push(entry);
		}
		return json;
	},
	export: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "export",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const strLength = leb.unsigned.readBn(stream).toNumber();
			const entry = {};
			entry.field_str = Buffer.from(stream.read(strLength)).toString();
			const kind = stream.read(1)[0];
			entry.kind = EXTERNAL_KIND[kind];
			entry.index = leb.unsigned.readBn(stream).toNumber();
			json.entries.push(entry);
		}
		return json;
	},
	start: (stream) => {
		const json = {
			name: "start",
		};

		json.index = leb.unsigned.readBn(stream).toNumber();
		return json;
	},
	element: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "element",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const entry = {
				elements: [],
			};

			entry.index = leb.unsigned.readBn(stream).toNumber();
			entry.offset = wasm2json.typeParsers.initExpr(stream);
			const numElem = leb.unsigned.readBn(stream).toNumber();
			for (let i = 0; i < numElem; i++) {
				const elem = leb.unsigned.readBn(stream).toNumber();
				entry.elements.push(elem);
			}

			json.entries.push(entry);
		}
		return json;
	},
	code: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "code",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const codeBody = {
				locals: [],
				code: [],
			};

			const bodySize = leb.unsigned.readBn(stream).toNumber();
			const endBytes = stream.bytesRead + bodySize;
			// parse locals
			const localCount = leb.unsigned.readBn(stream).toNumber();

			for (let q = 0; q < localCount; q++) {
				const local = {};
				local.count = leb.unsigned.readBn(stream).toNumber();
				const type = stream.read(1)[0];
				local.type = LANGUAGE_TYPES[type];
				codeBody.locals.push(local);
			}

			// parse code
			while (stream.bytesRead < endBytes) {
				const op = wasm2json.parseOp(stream);
				codeBody.code.push(op);
			}

			json.entries.push(codeBody);
		}
		return json;
	},
	data: (stream) => {
		const numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		const json = {
			name: "data",
			entries: [],
		};

		for (let i = 0; i < numberOfEntries; i++) {
			const entry = {};
			entry.index = leb.unsigned.readBn(stream).toNumber();
			entry.offset = wasm2json.typeParsers.initExpr(stream);
			const segmentSize = leb.unsigned.readBn(stream).toNumber();
			entry.data = [...stream.read(segmentSize)];

			json.entries.push(entry);
		}
		return json;
	},
	datacount: (stream) => {
		const _numberOfEntries = leb.unsigned.readBn(stream).toNumber();
		return null;
	},
});

wasm2json.parseOp = (stream) => {
	const json = {};
	const op = stream.read(1)[0];
	let fullName = OPCODES[op];
	if (fullName === "truncation") {
		const truncation_type = leb.unsigned.readBn(stream); // Buffer.from(stream.read(4)).readUInt32LE()
		if (!TRUNCATION_CODES[truncation_type]) {
			throw new Error(`unknown truncation type: ${truncation_type}`);
		}
		fullName = TRUNCATION_CODES[truncation_type];
	}

	let [type, name] = fullName.split(".");

	if (name === undefined) {
		name = type;
	} else {
		json.return_type = type;
	}

	json.name = name;

	const immediates = OP_IMMEDIATES[name === "const" ? type : name];
	if (immediates) {
		json.immediates = wasm2json.immediataryParsers[immediates](stream);
	}
	return json;
};

wasm2json.parse = (stream, filter) => {
	const preramble = wasm2json.parsePreramble(stream);
	const json = [preramble];

	while (!stream.end) {
		const header = wasm2json.parseSectionHeader(stream);
		const element = sectionParsers[header.name](stream, header);
		if (element !== null) {
			json.push(element);
		}
	}
	return json;
};

export { wasm2json };

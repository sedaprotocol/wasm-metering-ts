const GAS_PER_OPRATION = 125 * 15;
const GAS_ACCOUNTING_MULTIPLIER = 3_000;

const GAS_ACCOUNTING_OPCODE = GAS_PER_OPRATION * GAS_ACCOUNTING_MULTIPLIER;

export const costTable = {
	memory: {
		maximum: 200,
	},
	start: 1,
	type: {
		params: {
			DEFAULT: GAS_PER_OPRATION,
		},
		return_type: {
			DEFAULT: GAS_PER_OPRATION,
		},
	},
	import: 1,
	code: {
		locals: {
			DEFAULT: GAS_PER_OPRATION,
		},
		code: {
			DEFAULT: GAS_PER_OPRATION,
			// get_local: 1,
			// set_local: 1,
			// tee_local: 1,
			// get_global: 1,
			// set_global: 1,

			// load8_s: 1,
			// load8_u: 1,
			// load16_s: 1,
			// load16_u: 1,
			// load32_s: 1,
			// load32_u: 1,
			// load: 1,

			// store8: 1,
			// store16: 1,
			// store32: 1,
			// store: 1,

			// grow_memory: 1,
			// current_memory: 1,

			end: GAS_ACCOUNTING_OPCODE,
			if: GAS_ACCOUNTING_OPCODE,
			else: GAS_ACCOUNTING_OPCODE,
			br: GAS_ACCOUNTING_OPCODE,
			br_table: GAS_ACCOUNTING_OPCODE,
			br_if: GAS_ACCOUNTING_OPCODE,
			call: GAS_ACCOUNTING_OPCODE,
			call_indirect: GAS_ACCOUNTING_OPCODE,
			return: GAS_ACCOUNTING_OPCODE,
			throw: GAS_ACCOUNTING_OPCODE,
			throw_ref: GAS_ACCOUNTING_OPCODE,
			rethrow: GAS_ACCOUNTING_OPCODE,
			delegate: GAS_ACCOUNTING_OPCODE,
			catch: GAS_ACCOUNTING_OPCODE,
			return_call: GAS_ACCOUNTING_OPCODE,
			return_call_indirect: GAS_ACCOUNTING_OPCODE,
			br_on_cast: GAS_ACCOUNTING_OPCODE,
			br_on_cast_fail: GAS_ACCOUNTING_OPCODE,
			call_ref: GAS_ACCOUNTING_OPCODE,
			return_call_ref: GAS_ACCOUNTING_OPCODE,
			br_on_null: GAS_ACCOUNTING_OPCODE,
			br_on_non_null: GAS_ACCOUNTING_OPCODE,

			// nop: 1,
			// block: 1,
			// loop: 1,
			// if: 1,
			// then: 1,
			// else: 1,
			// br: 1,
			// br_if: 1,
			// br_table: 1,
			// return: 1,

			// call: 1,
			// call_indirect: 1,

			// const: 1,

			// add: 1,
			// sub: 1,
			// mul: 1,
			// div_s: 1,
			// div_u: 1,
			// rem_s: 1,
			// rem_u: 1,
			// and: 1,
			// or: 1,
			// xor: 1,
			// shl: 1,
			// shr_u: 1,
			// shr_s: 1,
			// rotl: 1,
			// rotr: 1,
			// eq: 1,
			// eqz: 1,
			// ne: 1,
			// lt_s: 1,
			// lt_u: 1,
			// le_s: 1,
			// le_u: 1,
			// gt_s: 1,
			// gt_u: 1,
			// ge_s: 1,
			// ge_u: 1,
			// clz: 1,
			// ctz: 1,
			// popcnt: 1,

			// drop: 1,
			// select: 1,

			// unreachable: 1,
		},
	},
	data: 1,
};

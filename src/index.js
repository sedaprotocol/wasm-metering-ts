import { json2wasm } from "./json2wasm.js";
import { injectMemoryLimit } from "./memory.js";
import { meterJSON } from "./meter-json.js";
import { wasm2json } from "./wasm2json.js";

/**
 * Meters WebAssembly code by injecting gas metering
 * @param {Buffer} wasm - The WebAssembly binary to meter
 * @param {object} costJson - The cost table to use for metering
 * @returns {Buffer} The metered WebAssembly binary
 */
export function meterWasm(wasm, costJson) {
	const json = wasm2json(wasm);
	const finalJson = injectMemoryLimit(json, costJson.memory.maximum ?? 200);

	const metered = meterJSON(finalJson, costJson, {
		meterType: "i64",
		moduleStr: "vm",
		fieldStr: "meter",
	});

	return json2wasm(metered);
}

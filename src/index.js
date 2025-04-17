import { meterJSON } from "./meter-json.js";
import { costTable } from "./cost-table.js";
import { json2wasm } from "./json2wasm.js";
import { wasm2json } from "./wasm2json.js";
import { injectMemoryLimit } from "./memory.js";
import { writeFileSync } from "node:fs";

/**
 * Meters WebAssembly code by injecting gas metering
 * @param {Buffer} wasm - The WebAssembly binary to meter
 * @param {object} [costJson=costTable] - The cost table to use for metering
 * @returns {Buffer} The metered WebAssembly binary
 */
export function meterWasm(wasm, costJson = costTable) {
	const json = wasm2json(wasm);
	writeFileSync("./doodle.json", JSON.stringify(json));
	const finalJson = injectMemoryLimit(json, costJson.memory.maximum ?? 200);

	const metered = meterJSON(finalJson, {
		meterType: "i64",
		moduleStr: "vm",
		fieldStr: "meter", 
		costTable: costJson,
	});



	const wasmFile = json2wasm(metered);

	writeFileSync("./doodles.wasm", wasmFile);

	return wasmFile;
}

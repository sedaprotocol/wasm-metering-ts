// @ts-ignore
import { meterJSON } from "warp-wasm-metering";
import { costTable } from "./cost-table.js";
import { json2wasm } from "./json2wasm.js";
import { wasm2json } from "./wasm2json.js";

const meterWasm = (wasm: Buffer) => {
	const json = wasm2json(wasm);
	console.log("json created");

	Bun.write("./aaa.json", JSON.stringify(json, null, 4));	

	const metered = meterJSON(json, {
		meterType: "i32",
		moduleStr: "vm",
		fieldStr: "meter",
		costTable,
	});



	return json2wasm(metered);
};

export { meterWasm };

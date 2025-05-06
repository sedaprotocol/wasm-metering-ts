import { SECTION_IDS } from "./json2wasm.js";

// gets the cost of an operation for entry in a section from the cost table
function getCost(json, costTable = {}, defaultCost = 0) {
	let cost = 0;
	// finds the default cost
	const fallbackCost =
		costTable.DEFAULT !== undefined ? costTable.DEFAULT : defaultCost;

	if (Array.isArray(json)) {
		for (const el of json) {
			cost += getCost(el, costTable);
		}
	} else if (typeof json === "object") {
		for (const propName in json) {
			const propCost = costTable[propName];
			if (propCost) {
				cost += getCost(json[propName], propCost, fallbackCost);
			}
		}
	} else if (costTable[json] === undefined) {
		cost = fallbackCost;
	} else {
		cost = costTable[json];
	}
	return cost;
}

// meters a single code entry
function meterCodeEntry(entry, costTable, cost, meterIndex, exhaustedIndex) {
	// Generate the metering opcodes similar to how Wasmer does it.
	function meteringStatement(accumulatedCost) {
		return [
			{
				name: "get_global",
				immediates: `${meterIndex}`,
			},
			{
				return_type: "i64",
				name: "const",
				immediates: `${accumulatedCost}`,
			},
			{
				return_type: "i64",
				name: "lt_u",
			},
			{ name: "if", immediates: "block_type" },
			{
				return_type: "i32",
				name: "const",
				immediates: "1",
			},
			{
				name: "set_global",
				immediates: `${exhaustedIndex}`,
			},
			{
				name: "unreachable",
			},
			{
				name: "end",
			},
			{
				name: "get_global",
				immediates: `${meterIndex}`,
			},
			{
				return_type: "i64",
				name: "const",
				immediates: `${accumulatedCost}`,
			},
			{
				return_type: "i64",
				name: "sub",
			},
			{
				name: "set_global",
				immediates: `${meterIndex}`,
			},
		];
	}

	// operations that can possible cause a branch
	const branchingOps = new Set([
		"loop",
		"end",
		"if",
		"else",
		"br",
		"br_table",
		"br_if",
		"call",
		"call_indirect",
		"return",
	]);

	let code = entry.code.slice();
	let meteredCode = [];

	cost += getCost(entry.locals, costTable.local);

	while (code.length) {
		let i = 0;

		// meters a segment of wasm code
		while (true) {
			const op = code[i++];

			cost += getCost(op.name, costTable.code);
			if (branchingOps.has(op.name)) {
				break;
			}
		}

		// get the segment of code to be metered
		let segment = code.slice(0, i);

		// add the metering statement when there's a cost to meter
		if (cost !== 0) {
			const mStatement = meteringStatement(cost);
			// Mimic wasmer's behavior by inserting the metering statement before the last operation
			const lastOp = segment.pop();
			segment = segment.concat(mStatement);
			segment.push(lastOp);
		}

		meteredCode = meteredCode.concat(segment);

		// start a new segment
		code = code.slice(i);
		cost = 0;
	}

	entry.code = meteredCode;
	return entry;
}

/**
 * Injects metering into a JSON output of [wasm2json](https://github.com/ewasm/wasm-json-toolkit#wasm2json)
 * @param {Object} json the json tobe metered
 * @param {Object} costTable the cost table to meter with.
 * @return {Object} the metered json
 */
export function meterJSON(json, costTable) {
	function findSection(module, sectionName) {
		return module.find((section) => section.name === sectionName);
	}

	function createSection(module, name) {
		const newSectionId = SECTION_IDS[name];
		for (const index in module) {
			const section = module[index];
			const sectionId = SECTION_IDS[section.name];
			if (sectionId) {
				if (newSectionId < sectionId) {
					// inject a new section
					module.splice(index, 0, {
						name,
						entries: [],
					});
					return;
				}
			}
		}
	}

	// add nessicarry sections iff they don't exist
	if (!findSection(json, "export")) createSection(json, "export");
	if (!findSection(json, "global")) createSection(json, "global");

	const globalMeteringPoints = {
		type: {
			contentType: "i64",
			mutability: 1,
		},
		init: {
			return_type: "i64",
			name: "const",
			// We set the initial gas limit to 0 and expect the caller to set the gas limit
			// through the export.
			immediates: "0",
		},
	};
	const globalOutOfGas = {
		type: {
			contentType: "i32",
			mutability: 1,
		},
		init: {
			return_type: "i32",
			name: "const",
			immediates: "0",
		},
	};

	const exportMeteringPoints = {
		field_str: "metering_remaining_points",
		kind: "global",
		index: Number.NaN,
	};
	const exportOutOfGas = {
		field_str: "metering_points_exhausted",
		kind: "global",
		index: Number.NaN,
	};

	json = json.slice(0);

	for (let section of json) {
		section = Object.assign(section);
		switch (section.name) {
			case "type":
				break;
			case "function":
				break;
			case "import":
				break;
			case "export":
				section.entries.push(exportMeteringPoints);
				section.entries.push(exportOutOfGas);
				break;
			case "element":
				break;
			case "start":
				break;
			case "global":
				exportMeteringPoints.index =
					section.entries.push(globalMeteringPoints) - 1;
				exportOutOfGas.index = section.entries.push(globalOutOfGas) - 1;
				break;
			case "code":
				for (const i in section.entries) {
					const entry = section.entries[i];

					meterCodeEntry(
						entry,
						costTable.code,
						0,
						exportMeteringPoints.index,
						exportOutOfGas.index,
					);
				}
				break;
		}
	}

	return json;
}

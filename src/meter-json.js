const text2json = require("./text2json.js");
const SECTION_IDS = require("./json2wasm").SECTION_IDS;

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

// meters a single code entrie
function meterCodeEntry(entry, costTable, meterFuncIndex, meterType, cost) {
	function meteringStatement(cost, meteringImportIndex) {
		return text2json(`${meterType}.const ${cost} call ${meteringImportIndex}`);
	}

	function remapOp(op, funcIndex) {
		if (op.name === "call" && op.immediates >= funcIndex) {
			op.immediates = (++op.immediates).toString();
		}
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
			remapOp(op, meterFuncIndex);

			cost += getCost(op.name, costTable.code);
			if (branchingOps.has(op.name)) {
				break;
			}
		}

		// get the segment of code to be metered
		let segment = code.slice(0, i);

		// add the metering statement when there's a cost to meter
		if (cost !== 0) {
			const mStatement = meteringStatement(cost, meterFuncIndex);
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
 * @param {Object} opts
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {Object} the metered json
 */
exports.meterJSON = (json, costTable, opts) => {
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

	let funcIndex = 0;
	let functionModule, typeModule;

	let { moduleStr, fieldStr, meterType } = opts;

	// set defaults
	if (!moduleStr) moduleStr = "metering";
	if (!fieldStr) fieldStr = "usegas";
	if (!meterType) meterType = "i32";

	// add nessicarry sections iff they don't exist
	if (!findSection(json, "type")) createSection(json, "type");
	if (!findSection(json, "import")) createSection(json, "import");

	const importJson = {
		moduleStr: moduleStr,
		fieldStr: fieldStr,
		kind: "function",
	};
	const importType = {
		form: "func",
		params: [meterType],
	};

	json = json.slice(0);

	for (let section of json) {
		section = Object.assign(section);
		switch (section.name) {
			case "type":
				// mark the import index
				importJson.type = section.entries.push(importType) - 1;
				// save for use for the code section
				typeModule = section;
				break;
			case "function":
				// save for use for the code section
				functionModule = section;
				break;
			case "import":
				for (const entry of section.entries) {
					if (entry.moduleStr === moduleStr && entry.fieldStr === fieldStr) {
						throw new Error("importing metering function is not allowed");
					}
					if (entry.kind === "function") {
						funcIndex++;
					}
				}
				// append the metering import
				section.entries.push(importJson);
				break;
			case "export":
				for (const entry of section.entries) {
					if (entry.kind === "function" && entry.index >= funcIndex) {
						entry.index++;
					}
				}
				break;
			case "element":
				for (const entry of section.entries) {
					// remap elements indices
					entry.elements = entry.elements.map((el) =>
						el >= funcIndex ? ++el : el,
					);
				}
				break;
			case "start":
				// remap start index
				if (section.index >= funcIndex) section.index++;
				break;
			case "code":
				for (const i in section.entries) {
					const entry = section.entries[i];
					const typeIndex = functionModule.entries[i];
					const type = typeModule.entries[typeIndex];
					const cost = getCost(type, costTable.type);

					meterCodeEntry(entry, costTable.code, funcIndex, meterType, cost);
				}
				break;
		}
	}

	return json;
};

const toolkit = require('warp-wasm-json-toolkit');
const text2json = toolkit.text2json;
const SECTION_IDS = require('./json2wasm').SECTION_IDS;
const defaultCostTable = require('./default-cost-table.json');

const test = {};

// gets the cost of an operation for entry in a section from the cost table
function getCost(json, costTable = {}, defaultCost = 0) {
    let cost = 0;
    // finds the default cost
    defaultCost = costTable['DEFAULT'] !== undefined ? costTable['DEFAULT'] : 0;

    if (Array.isArray(json)) {
        json.forEach((el) => {
            cost += getCost(el, costTable);
        });
    } else if (typeof json === 'object') {
        for (const propName in json) {
            const propCost = costTable[propName];
            if (propCost) {
                cost += getCost(json[propName], propCost, defaultCost);
            }
        }
    } else if (costTable[json] === undefined) {
        cost = defaultCost;
    } else {
        cost = costTable[json];
    }

    test[cost] = test[cost] ? test[cost] + 1 : 1;

    return cost;
}

// meters a single code entrie
function meterCodeEntry(entry, costTable, meterFuncIndex, meterType, cost) {
    function meteringStatement(cost, meteringImportIndex) {
        return text2json(`${meterType}.const ${cost} call ${meteringImportIndex}`);
    }
    function remapOp(op, funcIndex) {
        if (op.name === 'call' && op.immediates >= funcIndex) {
            op.immediates = (++op.immediates).toString();
        }
    }
    function meterTheMeteringStatement() {
        const code = meteringStatement(0, 0);
        // sum the operations cost
        return code.reduce((sum, op) => sum + getCost(op.name, costTable.code), 0);
    }

    // operations that can possible cause a branch
    const branchingOps = new Set([
        // 'grow_memory', 
        'loop',
        'end',
        'else',
        'br',
        'br_table',
        'br_if',
        "call",
        "call_indirect",
        // 'if', // wasmer excludes this for some reason, fixed in later versions..
        'return',

        // more 
        // 'return_call_indirect',
    ]);
    // const meteringOverHead = meterTheMeteringStatement();
    let code = entry.code.slice();
    let meteredCode = [];

    cost += getCost(entry.locals, costTable.local);

    while (code.length) {
        let i = 0;

        // meters a segment of wasm code
        while (true) {
            const op = code[i++];
            // console.log('[DEBUG]: op ::: ', op);
            remapOp(op, meterFuncIndex);

            cost += getCost(op.name, costTable.code);
            if (branchingOps.has(op.name)) {
                break;
            }
        }

        let segment = code.slice(0, i);
        // console.log('[DEBUG]: segment ::: ', segment);

        // add the metering statement
        if (cost !== 0) {
            // add the cost of metering
            // cost += meteringOverHead;
            // cost -= meteringOverHead;
            // console.log('[DEBUG]: cost ::: ', cost);
            const mStatement = meteringStatement(cost, meterFuncIndex);
            // console.log('[DEBUG]: mStatement ::: ', mStatement);


            // LOOK AT THIS PART FRANKLIN
            // Mimic wasmer's behavior by inserting the metering statement before the last operation
            const lastOp = segment.pop();
            segment = segment.concat(mStatement);
            segment.push(lastOp);
            // console.log('[DEBUG]: meteredSegment ::: ', segment);
            // meteredCode = meteredCode.concat(segment);
        }


        meteredCode = meteredCode.concat(segment); // add the metering statement

        // if (cost !== 0) {
        //     // add the cost of metering
        //     // cost += meteringOverHead;
        //     // cost -= meteringOverHead;
        //     // console.log('[DEBUG]: cost ::: ', cost);
        //     const mStatement = meteringStatement(cost, meterFuncIndex);
        //     console.log('[DEBUG]: mStatement ::: ', mStatement);
        //     meteredCode = meteredCode.concat(mStatement);
        // }

        //          // start a new segment
        //          const segment = code.slice(0, i);
        //          console.log('[DEBUG]: segment ::: ', segment);
        // meteredCode = meteredCode.concat(segment);
       
        code = code.slice(i);
        cost = 0;
    }

    entry.code = meteredCode;
    return entry;
}

/**
 * Injects metering into a JSON output of [wasm2json](https://github.com/ewasm/wasm-json-toolkit#wasm2json)
 * @param {Object} json the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {Object} the metered json
 */
exports.meterJSON = (json, opts) => {
    function findSection(module, sectionName) {
        return module.find((section) => section.name === sectionName);
    }

    function createSection(module, name) {
        const newSectionId = SECTION_IDS[name];
        for (let index in module) {
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

    let { costTable, moduleStr, fieldStr, meterType } = opts;

    // set defaults
    if (!costTable) costTable = defaultCostTable;
    if (!moduleStr) moduleStr = 'metering';
    if (!fieldStr) fieldStr = 'usegas';
    if (!meterType) meterType = 'i32';

    // add nessicarry sections iff they don't exist
    if (!findSection(json, 'type')) createSection(json, 'type');
    if (!findSection(json, 'import')) createSection(json, 'import');

    const importJson = {
        moduleStr: moduleStr,
        fieldStr: fieldStr,
        kind: 'function',
    };
    const importType = {
        form: 'func',
        params: [meterType],
    };

    json = json.slice(0);

    for (let section of json) {
        section = Object.assign(section);
        switch (section.name) {
            case 'type':
                // mark the import index
                importJson.type = section.entries.push(importType) - 1;
                // save for use for the code section
                typeModule = section;
                break;
            case 'function':
                // save for use for the code section
                functionModule = section;
                break;
            case 'import':
                for (const entry of section.entries) {
                    if (entry.moduleStr === moduleStr && entry.fieldStr === fieldStr) {
                        throw new Error('importing metering function is not allowed');
                    }
                    if (entry.kind === 'function') {
                        funcIndex++;
                    }
                }
                // append the metering import
                section.entries.push(importJson);
                break;
            case 'export':
                for (const entry of section.entries) {
                    if (entry.kind === 'function' && entry.index >= funcIndex) {
                        entry.index++;
                    }
                }
                break;
            case 'element':
                for (const entry of section.entries) {
                    // remap elements indices
                    entry.elements = entry.elements.map((el) =>
                        el >= funcIndex ? ++el : el
                    );
                }
                break;
            case 'start':
                // remap start index
                if (section.index >= funcIndex) section.index++;
                break;
            case 'code':
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

    console.log('[DEBUG]: test ::: ', test);

    return json;
};

/**
 * Injects metering into a webassembly binary
 * @param {Object} json the json tobe metered
 * @param {Object} opts
 * @param {Object} [opts.costTable=defaultTable] the cost table to meter with. See these notes about the default.
 * @param {String} [opts.moduleStr='metering'] the import string for the metering function
 * @param {String} [opts.fieldStr='usegas'] the field string for the metering function
 * @param {String} [opts.meterType='i64'] the register type that is used to meter. Can be `i64`, `i32`, `f64`, `f32`
 * @return {Buffer}
 */
exports.meterWASM = (wasm, opts = {}) => {
    let json = toolkit.wasm2json(wasm);
    json = exports.meterJSON(json, opts);
    return toolkit.json2wasm(json);
};

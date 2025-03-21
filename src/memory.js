import { writeFileSync } from "node:fs";

/**
 * Injects an memory import and makes sure there is no self-assigned memory functions
 * 
 * @param {any[]} json 
 * @param {number} maximumMemoryPages
 */
export function injectMemoryLimit(json, maximumMemoryPages) {
    for (let index = 0; index < json.length; index++) {
        const element = json[index];
        
        // Rewrite all memory to use the flags of 1 with a maximum
        if (element.name === "memory") {
            for (const entry of element.entries) {
                entry.flags = 1;
                entry.maximum = maximumMemoryPages;
            }
        }
    }

    return json;
}
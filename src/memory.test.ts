import { describe, it, expect } from "bun:test";
import { resolve } from "node:path";
import { meterWasm } from ".";

describe("memory", () => {
    it("should replace memory exports with imports", async () => {
        const wasmBytes = await Bun.file(resolve(import.meta.dir, "../assign_too_much_memory.wasm")).bytes();
        const result = meterWasm(Buffer.from(wasmBytes));

        // Ensure that the WASM module is still valid
        const module = new WebAssembly.Module(result);

        console.log('[DEBUG]: module ::: ', module);
    });

    it("should replace memory exports with imports even if it exists", async () => {
        const wasmBytes = await Bun.file(resolve(import.meta.dir, "../import_memory_from_env.wasm")).bytes();
        const result = meterWasm(Buffer.from(wasmBytes));

    });
});
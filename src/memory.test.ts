import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { meterWasm } from ".";
import { costTable } from "./cost-table-example.js";

describe("memory", () => {
	it("should fail to instantiate when it exceeds the memory limit", async () => {
		const wasmBytes = await Bun.file(
			resolve(import.meta.dir, "../assign_too_much_memory.wasm"),
		).bytes();
		const result = meterWasm(Buffer.from(wasmBytes), costTable);

		// Ensure that the WASM module throws an error when trying to instantiate
		expect(() => new WebAssembly.Module(result)).toThrow();
	});

	it("should replace memory exports with imports even if it exists", async () => {
		const wasmBytes = await Bun.file(
			resolve(import.meta.dir, "../import_memory_from_env.wasm"),
		).bytes();
		const result = meterWasm(Buffer.from(wasmBytes), costTable);

		// Ensure that the WASM module is valid
		expect(() => new WebAssembly.Module(result)).not.toThrow();
	});

	it("should be fast", async () => {
		const wasmBytes = await Bun.file(
			resolve(import.meta.dir, "../import_memory_from_env.wasm"),
		).bytes();

		let result: Buffer;
		let totalTime = 0;

		for (let i = 0; i < 1000; i++) {
			const start = performance.now();
			result = meterWasm(Buffer.from(wasmBytes), costTable);
			const end = performance.now();
			totalTime += end - start;
		}

		const avgTime = totalTime / 1000;

		// Ensure that the WASM module is valid
		expect(() => new WebAssembly.Module(result)).not.toThrow();
		expect(avgTime).toBeLessThan(0.3);
	});
});

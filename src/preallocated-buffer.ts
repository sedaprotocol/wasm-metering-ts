/**
 * A buffer class that pre-allocates memory and grows as needed.
 * Similar to Stream but with a simpler implementation focused on Buffer operations.
 * Pre-allocates a fixed size buffer and automatically grows it when more space is needed.
 * More efficient than creating new buffers for each write operation.
 */
export class PreallocatedBuffer {
	private buf: Buffer;
	private written = 0;

	constructor(size = 10_000) {
		this.buf = Buffer.alloc(size);
	}

	/**
	 * Writes a buffer to the pre-allocated buffer. Will grow the buffer as needed.
	 * @param {Buffer} newBuffer - The buffer to write.
	 */
	write(newBuffer: Buffer | number[]) {
		if (typeof newBuffer === "string") {
			// biome-ignore lint/style/noParameterAssign: Compatiblity fix :(
			newBuffer = Buffer.from(newBuffer);
		}
		if (this.buf.length - this.written <= newBuffer.length) {
			const oldBuffer = this.buf;
			// Aggressively double the buffer size
			this.buf = Buffer.alloc((this.buf.length + newBuffer.length) * 2);
			this.buf.set(oldBuffer);
		}

		this.buf.set(newBuffer, this.written);
		this.written += newBuffer.length;
	}

	/**
	 * Not implemented, but present for compatibility with Stream.
	 */
	read(size: number): Buffer {
		throw new Error("Not implemented");
	}

	/**
	 * Returns the number of bytes written to the buffer.
	 * @returns {number} The number of bytes written.
	 */
	get bytesWrote(): number {
		return this.written;
	}

	/**
	 * Returns the current buffer as a subarray of the pre-allocated buffer.
	 * @returns {Buffer} The current buffer.
	 */
	get buffer(): Buffer {
		return this.buf.subarray(0, this.written);
	}
}

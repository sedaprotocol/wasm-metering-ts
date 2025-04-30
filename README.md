# js-wasm-metering

Wasm metering done similarly to Wasmer. The original made use of host calls to meter gas but we've changed the implementation to keep track of the gas limit from within the WASM world.

This started as a fork of https://www.npmjs.com/package/@aldea/wasm-metering?activeTab=readme with some modifications to make more truncate opcodes work. This in turn is just a wrapper around https://github.com/warp-contracts/warp-wasm-metering, but we moved most of the code inside this repository.

There is also code adapted from https://github.com/warp-contracts/warp-wasm-json-toolkit.

# License

[MPL-2.0][license]
[license]: https://tldrlegal.com/license/mozilla-public-license-2.0-(mpl-2)
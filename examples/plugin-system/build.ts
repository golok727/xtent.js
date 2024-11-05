await Bun.build({
	entrypoints: ["./lib/index.ts"],
	target: "node",
	naming: {
		entry: "lib.mjs",
	},
	outdir: "./lib",
	external: ["xtent.js"],
});

import {
	type Plugin,
	CodeTransformer,
	LicensePlugin,
	ShebangPlugin,
	ConfigPlugin,
} from "./lib";

const plugins: Plugin[] = [
	// merges all config together
	ConfigPlugin({ name: "thing", outDir: "./mock/dist" }),
	ConfigPlugin({
		inputs: { index: "./mock/index.myjs" },
	}),
	ConfigPlugin({ inputs: { cli: "./mock/cli.myjs" } }),

	// Transformation plugins
	LicensePlugin("MIT License\n2024 Aadi"),
	ShebangPlugin({ include: ["cli.myjs"] }),
];

const transformer = CodeTransformer(plugins);
transformer.build().forEach((f) => console.log("Output: " + f));

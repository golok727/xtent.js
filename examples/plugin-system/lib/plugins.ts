import { entity, type EntityType, type Store } from "xtent.js";
import type { Config, LoadedModule } from "./types";

export interface Plugin {
	register(store: Store): void;
}

export const ConfigPluginId = entity<Config>("Config");

export const TransformerPluginId = entity<{
	transform(input: LoadedModule): string;
}>("TransformerPlugin");

let key = 1;
export function ConfigPlugin(config: Partial<Config>): Plugin {
	return {
		register(store) {
			store.insert(ConfigPluginId(`${key++}`), config);
		},
	};
}

function TransformPlugin(
	name: string,
	transformer: EntityType<typeof TransformerPluginId>
): Plugin {
	return {
		register(store) {
			store.insert(TransformerPluginId(name), transformer);
		},
	};
}

export function ShebangPlugin({ include = [] }: { include?: string[] } = {}) {
	const set = new Set(include);
	return TransformPlugin("shebang", {
		transform({ code, inputFilename }) {
			if (!set.has(inputFilename)) return code;

			return "#!/usr/bin/env node\n" + code;
		},
	});
}

export function LicensePlugin(license: string) {
	return TransformPlugin("licence", {
		transform({ code }) {
			const l = `/*\n${license}\n*/`;
			return l + "\n\n" + code;
		},
	});
}

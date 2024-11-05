import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Context, Store } from 'xtent.js';
import { ConfigPluginId, type Plugin, TransformerPluginId } from './plugins';
import type { Config, LoadedModule } from './types';
// biome-ignore lint/suspicious/noExplicitAny: Sorry!
type Any = any;

export function CodeTransformer(plugins: Plugin[] = []) {
  const store = new Store();

  store.use(ConfigPluginId, buildConfigFromPlugins);

  for (const plugin of plugins) {
    plugin.register(store);
  }

  const cx = store.context();

  return {
    build() {
      const files = loadFiles(cx);

      const processed = files.map(mod => processModule(mod, cx));

      for (const file of processed) {
        const outDirPath = path.dirname(file.outFilePath);

        if (!existsSync(outDirPath)) {
          mkdirSync(outDirPath, { recursive: true });
        }

        writeFileSync(file.outFilePath, file.code, { encoding: 'utf8' });
      }

      return processed.map(f => f.outFilePath);
    },
  };
}

function buildConfigFromPlugins(cx: Context): Config {
  let mergedConfig: Config = {
    name: 'xtent',
    outDir: 'dist',
    inputs: Object.create(null),
  };

  const allConfig = cx.getAll(ConfigPluginId, {
    // exclude the default variant to avoid circular dependency available in @xtent.js >= 1.0.4
    exclude: [ConfigPluginId.variant /*default*/],
  });

  for (const c of allConfig.values()) {
    mergedConfig = mergeDeep(mergedConfig, c) as Config;
  }
  return mergedConfig;
}

function processModule(mod: LoadedModule, cx: Context): LoadedModule {
  for (const transformer of cx.getAll(TransformerPluginId).values()) {
    mod.code = transformer.transform(mod);
  }

  return mod;
}

function loadFiles(cx: Context): LoadedModule[] {
  const config = cx.get(ConfigPluginId);

  return Object.entries(config.inputs).map(([outFileName, inputFilePath]) => {
    inputFilePath = path.resolve(process.cwd(), inputFilePath);
    const inputFilename = path.basename(inputFilePath);

    return {
      code: readFileSync(inputFilePath, {
        encoding: 'utf8',
      }),
      inputFilename,
      inputFilePath,
      outFilePath: path.resolve(
        process.cwd(),
        config.outDir,
        outFileName + '.myjs'
      ),
    };
  });
}

function mergeDeep<T extends object, U extends object>(
  target: T,
  source: U
): T & U {
  const isObject = (obj: unknown): obj is object =>
    obj !== null && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source as T & U;
  }

  Object.keys(source).forEach(key => {
    const targetValue = (target as Any)[key];
    const sourceValue = (source as Any)[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      (target as Any)[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      (target as Any)[key] = mergeDeep(
        Object.assign({}, targetValue),
        sourceValue
      );
    } else {
      (target as Any)[key] = sourceValue;
    }
  });

  return target as T & U;
}

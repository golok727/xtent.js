import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { type Context, type EntityType, Store, entity } from 'xtent.js';

// biome-ignore lint/suspicious/noExplicitAny: Sorry!
type Any = any;

export function CodeTransformer(plugins: Plugin[] = []) {
  const store = new Store();

  store.use(Config, buildConfigFromPlugins);

  for (const plugin of plugins) {
    plugin.register(store);
  }

  const cx = store.context();

  return {
    build() {
      const files = loadFiles(cx);

      const processed = files.map(file => processFile(file, cx));

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

interface Config {
  name: string;
  outDir: string;
  inputs: Record<string, string>;
}

export interface Plugin {
  register(store: Store): void;
}

const Config = entity<Config>('TransformerConfig');

const InputTransformer = entity<{ transform(input: string): string }>(
  'InputTransformer'
);

let key = 1;
export function ConfigPlugin(config: Partial<Config>): Plugin {
  return {
    register(store) {
      store.insert(Config(`c-${key++}`), config);
    },
  };
}

function TransformPlugin(
  name: string,
  transformer: EntityType<typeof InputTransformer>
): Plugin {
  return {
    register(store) {
      store.insert(InputTransformer(name), transformer);
    },
  };
}

export function IndentationRemovePlugin() {
  return TransformPlugin('indentation removeer', {
    transform(code) {
      return code
        .split('\n')
        .map(c => c.trimStart())
        .join('\n');
    },
  });
}

export function ShebangPlugin() {
  return TransformPlugin('shebang', {
    transform(code) {
      return '#!/usr/bin/env node\n' + code;
    },
  });
}

export function LicensePlugin(licence: string) {
  return TransformPlugin('licence', {
    transform(code) {
      const l = `/*\n${licence}\n*/`;
      return l + '\n\n' + code;
    },
  });
}

function buildConfigFromPlugins(cx: Context): Config {
  let mergedConfig: Config = {
    name: 'bundle',
    outDir: 'dist',
    inputs: Object.create(null),
  };

  const allConfig = cx.getAll(Config, {
    // exclude the default variant to avoid circular dependency available in @xtent.js >= ^1.0.4
    exclude: [Config.variant /*default*/],
  });

  for (const c of allConfig.values()) {
    mergedConfig = mergeDeep(mergedConfig, c) as Config;
  }
  return mergedConfig;
}

function processFile(file: LoadedFile, cx: Context): LoadedFile {
  let code = file.code;

  for (const transformer of cx.getAll(InputTransformer).values()) {
    code = transformer.transform(code);
  }

  return { ...file, code };
}

interface LoadedFile {
  code: string;
  outFilePath: string;
}

function loadFiles(cx: Context): LoadedFile[] {
  const config = cx.get(Config);

  return Object.entries(config.inputs).map(([outFileName, inputFilePath]) => {
    return {
      code: readFileSync(path.resolve(process.cwd(), inputFilePath), {
        encoding: 'utf8',
      }),
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

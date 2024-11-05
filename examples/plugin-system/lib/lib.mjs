// lib/plugins.ts
import { entity } from "xtent.js";
var ConfigPluginId = entity("Config");
var TransformerPluginId = entity("TransformerPlugin");
var key = 1;
function ConfigPlugin(config) {
  return {
    register(store) {
      store.insert(ConfigPluginId(`${key++}`), config);
    }
  };
}
function TransformPlugin(name, transformer) {
  return {
    register(store) {
      store.insert(TransformerPluginId(name), transformer);
    }
  };
}
function ShebangPlugin({ include = [] } = {}) {
  const set = new Set(include);
  return TransformPlugin("shebang", {
    transform({ code, inputFilename }) {
      if (!set.has(inputFilename))
        return code;
      return "#!/usr/bin/env node\n" + code;
    }
  });
}
function LicensePlugin(license) {
  return TransformPlugin("licence", {
    transform({ code }) {
      const l = `/*\n${license}\n*/`;
      return l + "\n\n" + code;
    }
  });
}
// lib/transformer.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Store } from "xtent.js";
function CodeTransformer(plugins = []) {
  const store = new Store;
  store.use(ConfigPluginId, buildConfigFromPlugins);
  for (const plugin of plugins) {
    plugin.register(store);
  }
  const cx = store.context();
  return {
    build() {
      const files = loadFiles(cx);
      const processed = files.map((mod) => processModule(mod, cx));
      for (const file of processed) {
        const outDirPath = path.dirname(file.outFilePath);
        if (!existsSync(outDirPath)) {
          mkdirSync(outDirPath, { recursive: true });
        }
        writeFileSync(file.outFilePath, file.code, { encoding: "utf8" });
      }
      return processed.map((f) => f.outFilePath);
    }
  };
}
function buildConfigFromPlugins(cx) {
  let mergedConfig = {
    name: "xtent",
    outDir: "dist",
    inputs: Object.create(null)
  };
  const allConfig = cx.getAll(ConfigPluginId, {
    exclude: [ConfigPluginId.variant]
  });
  for (const c of allConfig.values()) {
    mergedConfig = mergeDeep(mergedConfig, c);
  }
  return mergedConfig;
}
function processModule(mod, cx) {
  for (const transformer of cx.getAll(TransformerPluginId).values()) {
    mod.code = transformer.transform(mod);
  }
  return mod;
}
function loadFiles(cx) {
  const config = cx.get(ConfigPluginId);
  return Object.entries(config.inputs).map(([outFileName, inputFilePath]) => {
    inputFilePath = path.resolve(process.cwd(), inputFilePath);
    const inputFilename = path.basename(inputFilePath);
    return {
      code: readFileSync(inputFilePath, {
        encoding: "utf8"
      }),
      inputFilename,
      inputFilePath,
      outFilePath: path.resolve(process.cwd(), config.outDir, outFileName + ".myjs")
    };
  });
}
function mergeDeep(target, source) {
  const isObject = (obj) => obj !== null && typeof obj === "object";
  if (!isObject(target) || !isObject(source)) {
    return source;
  }
  Object.keys(source).forEach((key2) => {
    const targetValue = target[key2];
    const sourceValue = source[key2];
    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key2] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key2] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key2] = sourceValue;
    }
  });
  return target;
}
export {
  ShebangPlugin,
  LicensePlugin,
  ConfigPlugin,
  CodeTransformer
};

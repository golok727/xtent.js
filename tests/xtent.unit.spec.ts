import { describe, expect, test } from 'vitest';
import {
  type Context,
  EntityNotFoundError,
  MissingDependencyError,
  Store,
  entity,
} from '../src';
import { CircularDependencyError } from '../src/context';
import { isEntityIdentifier } from '../src/entity';
import type { EntityType } from '../src/types';

export const AnySystem = entity<System>('System');
export const ContextSystemId = AnySystem('ContextSystem');
export const GraphicsSystemId = AnySystem('GraphicsSystem');

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function mergeDeep<T = any, U = any>(target: T, source: U): T & U {
  const isObject = (obj: unknown) => obj && typeof obj === 'object';

  if (!isObject(target) || !isObject(source)) {
    return source as T & U;
  }

  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  Object.keys(source as any).forEach(key => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      target[key] = targetValue.concat(sourceValue);
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      target[key] = mergeDeep(Object.assign({}, targetValue), sourceValue);
    } else {
      target[key] = sourceValue;
    }
  });

  return target as T & U;
}

abstract class System {
  state = 0;
  initialized(): boolean {
    return this.state === 1;
  }
  disposed(): boolean {
    return this.state === -1;
  }
  static id = ContextSystemId;

  init(): void {
    this.state = 1;
    ///
  }
  dispose(): void {
    this.state = -1;
    //
  }
}

class ContextSystem extends System {
  static id = ContextSystemId;
}

class GraphicsSystem extends System {
  static id = GraphicsSystemId;
}

describe('Store', () => {
  test('insert', () => {
    expect(1).toBe(1);
  });

  test('isEntityIdentifier', () => {
    expect(isEntityIdentifier(AnySystem)).toBe(true);
    expect(isEntityIdentifier(ContextSystemId)).toBe(true);
    expect(isEntityIdentifier({ thing: 2 })).toBe(false);
  });

  test('id', () => {
    const thing = entity('thing');
    expect(thing).toBeTypeOf('function');

    expect(thing.kind).toBe('thing');
    expect(thing.variant).toBe('default');

    const variant = thing('variant');
    expect(variant).toBeTypeOf('function');
    expect(variant.kind).toBe('thing');
    expect(variant.variant).toBe('variant');
  });

  describe('Code transformer example', () => {
    interface Config {
      name: string;
      outDir: string;
      inputs: Record<string, string>;
    }

    interface Plugin {
      register(store: Store): void;
    }

    const TransformerConfig = entity<Config>('TransformerConfig');

    const InputTransformer = entity<{ transform(input: string): string }>(
      'InputTransformer'
    );

    let key = 1;
    function ConfigPlugin(config: Partial<Config>): Plugin {
      return {
        register(store) {
          store.insert(TransformerConfig(`c-${key++}`), config);
        },
      };
    }

    function TransformerPlugin(
      name: string,
      transformer: EntityType<typeof InputTransformer>
    ): Plugin {
      return {
        register(store) {
          store.insert(InputTransformer(name), transformer);
        },
      };
    }

    function CodeTransformer(plugins: Plugin[] = []) {
      const store = new Store();

      const defaultConfig: Config = {
        name: 'bundle',
        outDir: 'dist',
        inputs: Object.create(null),
      };

      store.use(TransformerConfig, cx => {
        let mergedConfig = defaultConfig;

        const allConfig = cx.getAll(TransformerConfig, {
          // exclude the default variant to avoid circular dependency
          exclude: [TransformerConfig.variant],
        });

        for (const c of allConfig.values()) {
          mergedConfig = mergeDeep(mergedConfig, c) as Config;
        }
        return mergedConfig;
      });

      for (const plugin of plugins) {
        plugin.register(store);
      }

      const cx = store.context();

      return {
        transform() {
          let code = `
          import {hello} from "thing"
            
          `;

          for (const transformer of cx.getAll(InputTransformer).values()) {
            code = transformer.transform(code);
          }

          return code;
        },
      };
    }

    test('should work', () => {
      const plugins: Plugin[] = [
        ConfigPlugin({ name: 'thing' }),
        ConfigPlugin({ outDir: 'build' }),
        ConfigPlugin({
          inputs: { index: './src/index.ts', cli: './src/cli.ts' },
        }),
        ConfigPlugin({ inputs: { constants: './src/constants.ts' } }),
        // ----
        IndentationRemovePlugin(),
        ShebangPlugin(),
        LicensePlugin('MIT\n2024 Aadi'),
      ];

      function IndentationRemovePlugin() {
        return TransformerPlugin('indentation removeer', {
          transform(code) {
            return code
              .split('\n')
              .map(c => c.trimStart())
              .join('\n');
          },
        });
      }

      function ShebangPlugin() {
        return TransformerPlugin('shebang', {
          transform(code) {
            return '#!/usr/bin/env node\n' + code;
          },
        });
      }

      function LicensePlugin(licence: string) {
        return TransformerPlugin('licence', {
          transform(code) {
            const l = `/*\n${licence}\n*/`;
            return l + '\n\n' + code;
          },
        });
      }

      const transformer = CodeTransformer(plugins);

      const thing = `
/*
MIT
2024 Aadi
*/

#!/usr/bin/env node

import {hello} from "thing"
`.trim();

      expect(transformer.transform().trim()).toBe(thing);
    });
  });

  describe('Store.use', () => {
    interface KeyBinding {
      key: string;
      action: () => void;
    }

    class Editor {
      hasChanges = true;
      constructor(public bindings: KeyBinding[]) {}

      save() {
        this.hasChanges = false;
      }
      keyDown(key: string) {
        this.bindings.find(b => b.key === key)?.action();
      }
    }

    test('lazy load item', () => {
      const store = new Store();
      const Binding = entity<KeyBinding>('binding');
      const Thing = entity<number>('a');

      store.use(Binding('ctrl+s'), cx => ({
        key: 'ctrl+s',
        action: () => cx.get(Editor).save(),
      }));

      store.add(Editor, [[Binding]]);

      store.use(Binding('asd'), cx => ({
        action: () => {
          console.log(cx.get(Thing));
        },
        key: '',
      }));

      const cx = store.context();

      const editor = cx.get(Editor);

      expect(editor.hasChanges).toBe(true);
      editor.keyDown('ctrl+s');
      expect(editor.hasChanges).toBe(false);
    });

    test('pass functions into use', () => {
      const store = new Store();

      const a = entity<unknown>('a');
      const b = entity<unknown>('b');

      const another = (cx: Context) => {
        expect(cx).toBeDefined();
      };

      function thing(cx: Context) {
        expect(cx).toBeDefined();
      }

      store.use(a, thing);
      store.use(b, another);

      const cx = store.context();

      cx.get(a);
      cx.get(b);
    });
  });

  describe('Store.override', () => {
    interface Database {
      type: string;
    }

    class SqlDatabase implements Database {
      type = 'SQL';
    }

    class NoSqlDatabase implements Database {
      type = 'NOSQL';
    }

    class App {
      constructor(public database: Database) {}
    }

    test('override should override the service in the store', () => {
      const store = new Store();
      const Database = entity<Database>('Database');

      store.add(SqlDatabase);
      store.add(NoSqlDatabase);

      store.use(Database, cx => cx.get(SqlDatabase));

      store.add(App, [Database]);

      expect(store.context().get(App).database.type).toBe('SQL');
      store.override(Database, cx => cx.get(NoSqlDatabase));

      expect(store.context().get(App).database.type).toBe('NOSQL');
    });
  });

  describe('Store.add', () => {
    class Thing {
      name = 'Thing';
    }

    test('basic', () => {
      const store = new Store();
      store.add(Thing);
      expect(store.context().get(Thing).name).toBe('Thing');
    });

    class Hello {
      name: string;

      constructor(public thing: Thing) {
        this.name = 'Hello' + ' ' + this.thing.name;
      }
    }

    test('with basic dependency', () => {
      const store = new Store();
      store.add(Thing);
      store.add(Hello, [Thing]);
      const cx = store.context();

      expect(cx.get(Hello).name).toBe('Hello Thing');
      expect(cx.get(Hello).thing).toBe(cx.get(Thing));
    });

    test('with dependency array', () => {
      type Specs = {
        width: 100;
        height: 100;
      };
      class Renderer {
        constructor(
          public specs: Specs,
          public systems: System[]
        ) {}
      }
      const store = new Store();
      const SpecsId = entity<Specs>('Specs');

      store.use(SpecsId, { height: 100, width: 100 });
      store.use(AnySystem('Context'), ContextSystem);
      store.use(AnySystem('Graphics'), GraphicsSystem);
      store.add(Renderer, [SpecsId, [AnySystem]]);

      const cx = store.context();
      const renderer = cx.get(Renderer);
      expect(renderer.systems.length).toBe(2);
      expect(renderer.systems[0]).toBeInstanceOf(ContextSystem);
      expect(renderer.systems[1]).toBeInstanceOf(GraphicsSystem);
      expect(renderer.specs).toEqual({ width: 100, height: 100 });
    });
  });

  describe('Store.context.getAll()', () => {
    test('should return all the objects', () => {
      const store = new Store();

      store.use(ContextSystem.id, ContextSystem);
      store.use(GraphicsSystem.id, GraphicsSystem);

      const cx = store.context();
      const allMap = cx.getAll(AnySystem);

      expect(allMap).toEqual(
        new Map([
          ['ContextSystem', new ContextSystem()],
          ['GraphicsSystem', new GraphicsSystem()],
        ])
      );

      const all = [...allMap.values()];

      expect(all.length).toBe(2);
      expect(all[0]).toBeInstanceOf(ContextSystem);
      expect(all[1]).toBeInstanceOf(GraphicsSystem);
    });

    test('return empty map if no entities are found', () => {
      const store = new Store();

      const cx = store.context();

      const all = [...cx.getAll(AnySystem).values()];

      expect(all.length).toBe(0);
    });
  });
  describe('Store.context.get()', () => {
    test('should create objects', () => {
      const store = new Store();

      store.use(ContextSystem.id, ContextSystem);
      store.use(GraphicsSystem.id, GraphicsSystem);

      const cx = store.context();

      const get = () => {
        const contextSystem = cx.get(ContextSystem.id);
        const graphicsSystem = cx.get(ContextSystem.id);
        return { contextSystem, graphicsSystem } as const;
      };

      {
        const { contextSystem, graphicsSystem } = get();

        contextSystem.init();
        graphicsSystem.init();

        expect(contextSystem.initialized()).toBe(true);
        expect(graphicsSystem.initialized()).toBe(true);
      }

      {
        const { contextSystem, graphicsSystem } = get();

        expect(contextSystem.initialized()).toBe(true);
        expect(graphicsSystem.initialized()).toBe(true);

        contextSystem.dispose();
        graphicsSystem.dispose();

        expect(contextSystem.disposed()).toBe(true);
        expect(graphicsSystem.disposed()).toBe(true);
      }
      {
        const { contextSystem, graphicsSystem } = get();

        expect(contextSystem.initialized()).toBe(false);
        expect(graphicsSystem.initialized()).toBe(false);

        expect(contextSystem.disposed()).toBe(true);
        expect(graphicsSystem.disposed()).toBe(true);
      }
    });
    test('should throw if not available', () => {
      const store = new Store();

      const cx = store.context();
      expect(() => cx.get(ContextSystem.id)).toThrowError(EntityNotFoundError);
    });

    test('should throw if dependency not available', () => {
      const store = new Store();

      class Dep {}
      class Thing {
        constructor(public dep: Dep) {}
      }

      store.add(Thing, [Dep]);
      const cx = store.context();
      expect(() => cx.get(Thing)).toThrow(MissingDependencyError);
    });

    test('should throw if cycle found', () => {
      const store = new Store();

      class Dep {
        constructor(public thing: Thing) {}
      }
      class Thing {
        constructor(public dep: Dep) {}
      }

      store.add(Thing, [Dep]);
      store.add(Dep, [Thing]);

      const cx = store.context();
      expect(() => cx.get(Thing)).toThrow(CircularDependencyError);
    });

    test('should should pool objects', () => {
      const store = new Store();

      store.use(ContextSystem.id, ContextSystem);
      store.use(GraphicsSystem.id, GraphicsSystem);

      const cx = store.context();
      const contextSystem = cx.get(ContextSystem.id);
      const graphicsSystem = cx.get(GraphicsSystem.id);

      expect(contextSystem).toBe(cx.get(ContextSystem.id));
      expect(graphicsSystem).toBe(cx.get(GraphicsSystem.id));
    });

    test('should be the correct instance', () => {
      const store = new Store();

      store.use(ContextSystem.id, ContextSystem);
      store.use(GraphicsSystem.id, GraphicsSystem);

      const cx = store.context();

      const contextSystem = cx.get(ContextSystem.id);
      const graphicsSystem = cx.get(GraphicsSystem.id);

      expect(contextSystem).toBeInstanceOf(ContextSystem);
      expect(graphicsSystem).toBeInstanceOf(GraphicsSystem);
    });
  });
});

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

export const AnySystem = entity<System>('System');
export const ContextSystemId = AnySystem('ContextSystem');
export const GraphicsSystemId = AnySystem('GraphicsSystem');

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

  describe('Plugin systems', () => {
    interface Database {
      type: string;
    }

    const AnyDatabase = entity<Database>('AnyDatabase');

    abstract class DatabasePlugin implements Database {
      abstract type: string;

      static register(store: Store) {
        store.add(this as unknown as { new (): Database });
        store.override(AnyDatabase, cx => cx.get(this));
      }
    }

    class MockDatabase extends DatabasePlugin {
      type = 'MOCK';
    }

    class SqlDatabase extends DatabasePlugin {
      type = 'SQL';
    }

    class NoSqlDatabase extends DatabasePlugin {
      type = 'NOSQL';
    }

    interface Plugin {
      register(store: Store): void;
    }

    class App {
      static defaultPlugins: Plugin[] = [MockDatabase];

      cx: Context;

      constructor(plugins: Plugin[] = []) {
        const store = new Store();

        const allPlugins: Plugin[] = [...App.defaultPlugins, ...plugins];

        for (const plugin of allPlugins) {
          plugin.register(store);
        }

        this.cx = store.context();
      }

      get database() {
        return this.cx.get(AnyDatabase);
      }
    }

    test('should default to mock database', () => {
      expect(new App().database.type).toEqual('MOCK');
    });

    test('use a another database', () => {
      expect(new App([NoSqlDatabase]).database.type).toEqual('NOSQL');
      expect(new App([NoSqlDatabase, SqlDatabase]).database.type).toEqual(
        'SQL'
      );
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

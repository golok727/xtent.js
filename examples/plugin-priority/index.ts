import { type Context, Store, entity } from 'xtent.js';

interface Database {
  type: string;
}

interface Plugin {
  priority?: number;
  register(store: Store): void;
}

const DatabaseEntity = entity<Database>('Database');

const DatabasePluginEntity = entity<DatabasePluginMetadata>('DatabasePlugins');

type DatabaseConstructor = { new (): Database };

interface DatabasePluginMetadata {
  priority: number;
  impl: DatabaseConstructor;
  type: string;
}

class DatabasePlugin implements Database {
  static priority = 0;
  static type: string;

  get type() {
    return (this.constructor as typeof DatabasePlugin).type as string;
  }

  static register(store: Store) {
    if (!this.type) throw new Error('A type is required');
    store.add(this as unknown as DatabaseConstructor);

    store.use(DatabasePluginEntity(this.type), {
      type: this.type,
      impl: this as unknown as DatabaseConstructor,
      priority: this.priority,
    });
  }
}

class MockDatabase extends DatabasePlugin {
  static priority = 0;
  static type = 'MOCK';
}

class SQLDatabase extends DatabasePlugin {
  static priority = 1000;
  static type = 'SQL';
}

class NOSQLDatabase extends DatabasePlugin {
  static priority = 100;
  static type = 'NOSQL';
}

function resolvePreferedDatabase(cx: Context) {
  const availabledDatabases = cx.getAll(DatabasePluginEntity);

  const sorted = Array.from(availabledDatabases.values()).sort(
    (a, b) => b.priority - a.priority
  );

  const preferedDatabase = sorted.shift();

  if (preferedDatabase === undefined)
    throw new Error('no database implementation found');

  return cx.get(preferedDatabase.impl);
}

class App {
  static defaultPlugins: Plugin[] = [MockDatabase];
  cx: Context;

  constructor(plugins: Plugin[] = []) {
    const store = new Store();

    const allPlugins: Plugin[] = [...App.defaultPlugins, ...plugins];

    store.use(DatabaseEntity, resolvePreferedDatabase);

    for (const plugin of allPlugins) {
      plugin.register(store);
    }

    this.cx = store.context();
  }

  get database() {
    return this.cx.get(DatabaseEntity);
  }
}

console.log(new App().database.type); // Output: MOCK
console.log(new App([SQLDatabase, NOSQLDatabase]).database.type); // Output: SQL

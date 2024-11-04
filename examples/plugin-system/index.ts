console.log('Hello via Bun!');
import { type Context, Store, entity } from 'xtent.js';

interface Database {
  type: string;
  config: AppConfig;
}

// These are identifiers which will allow you to get any registered item the store
const AnyAppConfig = entity<AppConfig>('AppConfig');
const AnyDatabase = entity<Database>('AnyDatabase');

interface DatabaseConstructor {
  new (config: AppConfig): Database;
}

abstract class DatabasePlugin implements Database {
  abstract type: string;

  constructor(public config: AppConfig) {}

  static register(store: Store) {
    /*
      -> What this does ? 
      Register any Database implementation extended from this Plugin into the store
      Say you extened MockDatabase and SqlDatabase from this Plugin. In store it reflects as

      Store {
        "MockDatabase": { default: (cx) => MockDatabase },
        "SqlDatabse": { default: (cx) => SqlDatabase}
      }

      -> Whats the second array arument? 
       It's the dependency for this service.
       It will be passed to the constructor of the factory provided.

   */
    store.add(this as unknown as DatabaseConstructor, [AnyAppConfig]);

    /*

      Store {
        "MockDatabase": { default: (cx) => MockDatabase },
        "SqlDatabse": { default: (cx) => SqlDatabase}
        "AnyDatabase": { default: (cx) => Database(MockDatabse | SqlDatabse) }
      }

      if MockDatabase is used: 
      ------------------------

      Store {
        ...,
        "AnyDatabase": { default: (cx) => MockDatabase }
      }

      
      if SqlDatabase is used: 
      ------------------------

      Store {
        ...,
        "AnyDatabase": { default: (cx) => SqlDatabase }
      }
      
    */
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

function AppConfigPlugin(config: Partial<AppConfig>): Plugin {
  return {
    register(store) {
      store.insert(
        AnyAppConfig,
        { ...App.defaultConfig, ...config },
        { override: true }
      );
    },
  };
}

interface AppConfig {
  databaseUrl: string;
  name: string;
}

class App {
  static defaultConfig: AppConfig = {
    databaseUrl: 'localhost:5173',
    name: 'app',
  };

  static defaultPlugins: Plugin[] = [
    MockDatabase,
    AppConfigPlugin(this.defaultConfig),
  ];

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

  get config() {
    return this.cx.get(AnyAppConfig);
  }

  static create(fn: (app: App) => void, plugins: Plugin[] = []) {
    const app = new App(plugins);
    try {
      fn(app);
    } catch (err) {
      if (err instanceof Error) {
        console.error(err.constructor.name, err.message);
      }
    }
  }
}

App.create(app => {
  console.log(app.database.type); // Mock
  console.log(app.database.config);
});

App.create(
  app => {
    console.log(app.database.type); // Mock
    console.log(app.database.config);
  },
  [
    SqlDatabase,
    AppConfigPlugin({ databaseUrl: 'localhost:6969', name: 'sqlApp' }),
  ]
);

App.create(
  app => {
    console.log(app.database.type); // Mock
    console.log(app.database.config);
  },
  [
    NoSqlDatabase,

    AppConfigPlugin({ databaseUrl: 'localhost:7000', name: 'noSqlApp' }),
  ]
);

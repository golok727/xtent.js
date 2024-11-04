# `xtent.js` - Simple and Flexible Dependency Injection for JavaScript

This library provides a lightweight and easy-to-use dependency injection system for managing entities and their lifecycles in JavaScript applications. Whether you're building complex applications or simple ones, `xtent.js` helps you manage dependencies and systems efficiently.

## Features

- **Simple API** for managing dependencies and entities
- **Contextual Lookups** to get entities when needed
- **Automatic Dependency Resolution** between entities

## Installation

```bash
npm install xtent.js
```

## Basic Usage

Here’s a simple example to show how `xtent.js` can be used in an application.

### Example: Plugin systems

```ts
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

    console.log(new App().database.type) // MOCK
    console.log(new App([SqlDatabase]).database.type) // SQL
    console.log(new App([SqlDatabase, NoSqlDatabase]).database.type) // NOSQL

```

Comprehensive example coming soon 🙇

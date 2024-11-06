

# `xtent.js` - Simple and Flexible Dependency Injection for JavaScript

This library provides a lightweight and flexible dependency injection system for managing entities and their lifecycles in JavaScript applications. It helps streamline the process of dependency management in both small and large-scale applications by making use of context-based lookups, factory functions, and scoped entity management.

## Features

- **Simple API** for managing dependencies, entities, and their lifecycle
- **Scoped Entity Management** to isolate entities within different scopes
- **Automatic Dependency Resolution** between entities
- **Contextual Lookups** to fetch entities when needed
- **Flexible Override Mechanism** for replacing existing entities or factories

---

## Installation

Install the package using using your preferred package manager:

```bash
# npm
npm install xtent.js

# yarn 
yarn add xtent.js

#pnpm
pnpm add xtent.js

# bun
bun add xtent.js
```

---

## Basic Concepts

### 1. **Entity**
An entity is any construct (like a class, object, or factory) that you register with the store. Entities have **kinds** and **variants** that help identify them uniquely within the store.

### 2. **Store**
The `Store` is the central repository where entities are registered, stored, and managed. It allows you to define factories for creating instances of entities and ensures proper dependency injection. Additionally, the `Store` supports scoping, cloning, and context creation.

### 3. **Context**
A `Context` acts as the environment in which entity lookups and dependency resolutions are performed. Contexts can be nested, and each context is linked to a particular scope within the store.

---

## Examples 
- [Plugin System Example](./examples/plugin-system)
- [Plugins With Priority](./examples/plugin-priority)


## Basic Store API Overview

#### 1. `Store.add(ClassConstructor, ...dependencies: ConstructorParameters<ClassConstructor>)`
- Adds a class as a factory method to the store, optionally providing dependencies that will be injected into the constructor.

**Example:**
```ts
interface Config {
    width: number; 
    height: number; 
}

const RendererConfig = entity<Config>("RendererConfig");

class Renderer {
  constructor(public config: Config) {
    // Initialization code
  }
  
  render() {
    const {width , height} = this.config
    console.log(`Rendering... width = ${width}, height = ${height}`)
  }
}

const store = new Store(); 
store.add(Renderer, [RendererConfig]);  // Adds the Renderer class as a factory to the store and the config as a dependency
store.insert(RendererConfig, { width: 800 , height: 600 }) // insert a resolved value

const cx = store.context();
const renderer = cx.get(Renderer);
renderer.render();  // Output: Rendering... width=800, height=600
```

#### 2. `Store.insert<T>(EntityLike<T>, value: T)`
Registers an already existing entity or object directly into the store.

```ts
type Config = {dbUrl: string}; 

const config = { dbUrl: "database_url" } satisfies Config;

const AppConfigEntity = entity<Config>("AppConfigEntity");

store.insert(AppConfigEntity, config);

const cx = store.context();
const appConfig = cx.get(AppConfigEntity); 

console.log(appConfig.dbUrl);  // Output: "database_url"
```

## Advanced entity registration with Store

#### 1. `Store.add(ClassConstructor, ...dependencies: ConstructorParameters<ClassConstructor>)`

```ts
type RendererConfig = {width: number, height: number, antialias: boolean};

interface System {
  init(): void; 
  dispose(): void; 
}

interface Pipeline {
  id: PipeId, 
  execute(): void;
}


// you can also name it same as the interface
const ConfigEntity = entity<Config>("Config"); 
const SystemEntity = entity<System>("System");
const PipelineEntity = entity<Pipeline>("Pipeline");

class Renderer {
  constructor(public config: RendererConfig, public systems: System[], public pipes: Pipeline[])
}

store.add(Renderer, [ConfigEntity, [SystemEntity], [PinelineEntity]]);  // Renderer reeq
// add all the config and systems too before getting context; 
store.insert(ConfigEntity, { width: 800, height: 600})

store.insert(SystemEntity("ContextSystem"), ContextSystemImpl)
store.insert(SystemEntity("GraphicsSystem"), GraphicsSystemImpl)


store.insert(PinelineEntity("GraphicsPipe"), GraphicsPipeImpl)

store.get(Renderer).config.width === 800 // true
store.get(Renderer).config.width === 600 // true
store.get(Renderer).systems.length === 2 // true
store.get(Renderer).pipes.length === 1 // true

```

#### 2. `Store.use()`
- Registers an implementation of an entity, either as an object, a class, or a factory function. This method also allows for injecting dependencies into the implementation.
- Throws an error if a implementation already exists. If you want to override please use `Store.override`

*Signatures*
```ts
store.use<T>(Entity<T>, T);
// or
store.use<T>(Entity<T>, (cx: Context) => T);
// or 
store.use<T>(Entity<T>, AnyConstructor<T>, [...deps]);
```


- *Example*  `store.use<T>(Entity<T>, T)`
```ts
store.use(ConfigEntity, { databaseUrl: "http://mydb.localhost:5757", dbName="thing" })

store.context().get(ConfigEntity) // { databaseUrl: "http://mydb.localhost:5757", dbName="thing" }
```

- *Example*  `store.use<T>(Entity<T>, (cx: Context) => T)`
```ts
// register a dev variant 
store.use(DatbaseEntity("dev"), MockDatabase, [ConfigEntity])
// register a prod variant
store.use(DatbaseEntity("prod"), SqlDatabase, [ConfigEntity])

// register default variant
store.use(DatabaseEntity, (cx) => process.env.DEV ? cx.get(DatabaseEntity("dev")) : cx.get(DatabaseEntity("prod")));


store.context().get(DatabaseEnity) // if process.env.DEV { resolves MockDatabase } else { resolves SqlDatabase }

```

- *Example* `store.use<T>(Entity<T>, AnyConstructor<T>, [...deps])`
```ts
interface Config { databaseUrl: string, ... }

const DatabaseEntitiy = entity<Database>("Database")

const ConfigEntity= entity<Database>("Config")

interface Database { ... }

class MockDatabase implements Database { ... }

class SqlDatabse implements Database { ... }

// use SqlDatabase as the default variant
store.use(DatabaseEntity, SqlDatabase, [ConfigEntity]);

// resolve default variant
store.context().get(DatbaseEntity) instanceof SqlDatabase // true 
```



#### 3. `override(Entity, implementation, ...dependencies)`
- Overrides an existing entity with a new implementation or factory function. This is useful when you want to replace the default behavior of an entity at runtime
- Functionality is same as `Store.use`

*Signatures*
```ts
store.override<T>(Entity<T>, T);
// or
store.override<T>(Entity<T>, (cx: Context) => T);
// or 
store.override<T>(Entity<T>, AnyConstructor<T>, [...deps]);
```


## Dependency Array

The `add`, `use`, and `override` methods in the store expect an optional array as their second argument, which defines dependencies for the factory functions. This dependency array allows you to specify what entities are needed when constructing instances.

### Key Points

- **Optional Dependency**: The second argument can be omitted if the factory does not require any dependencies for instantiation.
  
- **Dependency Types**: Dependencies can be:
  - **Entity Identifier**: An identifier representing an entity, typically of type `Entity<T>`.
  - **Class Constructor**: A constructor function for a class that defines the entity, referred to as `EntityLike<T>` in `xtent.js`.
  
- **Type Safety**: The dependency array ensures type safety, matching the types expected by the factory constructor.

- **Resolving Multiple Entities**: Use the `[Entity]` notation to resolve an array of entities in the dependency array.
- **`[Entity] notation`** Make sure this notation only have one element or it will throw an error

### Example Usage

```typescript
interface Config { 
  shouldLog: boolean; 
}

const NameEntity = entity<string>("Name"); 
const ItemEntity = entity<string>("Item");
const ConfigEntity = entity<Config>("Config"); 

class Thing {
  constructor(public name: string, public items: Item[], public config: Config) {}

  run() {
    if (this.config.shouldLog) {
      console.log(`${this.name} ${this.items.join(" ")}`);
    }
  }
}

const store = new Store();

// Inserting entities
store.insert(NameEntity, "thing"); 
store.insert(ItemEntity, "Item-1");
store.insert(ItemEntity, "Item-2");
store.insert(ConfigEntity("dev"), { shouldLog: false });
store.insert(ConfigEntity("prod"), { shouldLog: true });

// Using a configuration entity based on the environment
store.use(ConfigEntity /* default variant */, (cx) => 
  process.env.dev ? cx.get(ConfigEntity("dev")) : cx.get(ConfigEntity("prod"))
);

// Inserting the Thing entity with its dependencies
store.insert(Thing, [NameEntity, [ItemEntity], ConfigEntity]);

/* 
In the dependencies:
- [ItemEntity] indicates that all variants of ItemEntity should be resolved.
- NameEntity and ConfigEntity resolve to their default entities.
*/

const cx = store.context(); 
const thing = cx.get(Thing);
thing.run(); // In 'prod', no log; in 'dev', it logs "thing Item-1 Item-2"
```

- *Entity Definitions*: The `NameEntity`, `ItemEntity`, and `ConfigEntity` are defined using the `entity` function, specifying their types.

- *Class Implementation*: The `Thing` class accepts a name, an array of items, and a configuration object, with a run method that conditionally logs output based on the configuration.

- *Entity Insertion*: Various entities are inserted into the store, including multiple variants of ItemEntity and configurations for both development and production environments.

- *Dynamic Configuration*: The store.use method dynamically resolves the appropriate ConfigEntity based on the current environment (dev or prod).

- *Dependency Resolution*: When Thing is inserted into the store, its dependencies are explicitly defined, allowing the context to resolve these dependencies when an instance of Thing is requested.  


--- 

## Scoped Entities

Entities can be registered and resolved within different **scopes**. Scopes allow for grouping or isolating entities for better modularity and reusability. By default, all entities are registered within the root scope (`STORE_ROOT_SCOPE`), but you can create custom scopes for more fine-grained control.

### Example of Scoping:

```ts
const customScope = scope("custom-scope");

store.scope(customScope).add(Renderer);
const customCx = store.context(customScope);

const renderer = customCx.get(Renderer);  // Resolves the Renderer entity within the custom scope
```

---


## Context

### Description

The `Context` class is responsible for resolving entities and managing their dependencies. It supports hierarchical resolution by allowing a context to have a parent.

### Key Features

- **Dependency Resolution**: Automatically resolves and instantiates dependencies.
- **Optional Retrieval**: Supports fetching entities that may or may not exist.
- **Entity Pooling**: Caches instances of resolved entities to avoid repeated instantiation.


### Example Usage

```javascript
class Thing {
  a = 10, 
  b = 10,
}

class Language {
  name = "javascript"
}

const store = new Store();
store.add(Thing);

// creates a new context with the snapshot of current state of the store
const cx = store.context(); 

store.add(Language) // will not be included in `cx`

const thing = cx.get(Thing)

thing.a === 10 // true
thing.b === 10 // true

// ERROR
cx.get(Language) // throws an EntityNotFoundError as Language is added to store after the context creation


thing === cx.get(Thing) // true

const cx2 = store.context();

thing === cx2.get(Thing) // false

cx2.get(Language).name === "javascript" // true


```
The context always caches the result. This means that once the `Thing` instance is retrieved from a context, the same instance will be returned every time within that same context. A new instance of Thing will only be created when a new context is generated.
So, if you need another instance of Thing, simply create a new context.

### Methods

#### `get`

Retrieves an instance of an entity, resolving its dependencies.


```javascript
const instance = context.get(entity, options);
```

- **Parameters**:
  - `entity`: The entity to resolve.
  - `options`: Optional configuration for resolution.

- **Returns**: The resolved entity instance.
- **Errors**: `EntityNotFoundError`, `MissingDependencyError`, `CircularDependencyError`

#### `getAll`

Retrieves all instances of a specific entity type.

```javascript
const instances = context.getAll(entity, options);
```

- **Parameters**:
  - `entity`: The entity to resolve.
  - `options`: Optional configuration for resolution.

- **Returns**: A `Map` of entity variants to their resolved instances.
- **Errors**:  `MissingDependencyError`, `CircularDependencyError`

#### `getOptional`

Retrieves an instance of an entity, returning `null` if not found.

```javascript
const instance = context.getOptional(entity, options);
```

- **Parameters**:
  - `entity`: The entity to resolve.
  - `options`: Optional configuration for resolution.

- **Returns**: The resolved entity instance or `null`.
- **Errors**:  `MissingDependencyError`, `CircularDependencyError`

## Error Handling

The following errors may be thrown during entity resolution:

- **EntityNotFoundError**: Thrown when an entity cannot be found in the store.
- **CircularDependencyError**: Thrown when a circular dependency is detected during resolution.
- **MissingDependencyError**: Thrown when a required dependency for an entity is missing.



---

## Example: [Plugin System](./examples/plugin-system)
## Example: [Plugin System With priority](./examples/plugin-priority)

Here’s an example of how `xtent.js` can be used to implement a plugin-based system with priority.

```ts
import { Store, entity, type Context } from 'xtent.js';

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
```

In this example, plugins like `MockDatabase`, `SqlDatabase`, and `NoSqlDatabase` are dynamically registered and resolved by the store, making the app flexible and extendable.

---








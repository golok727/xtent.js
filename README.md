

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

Install the package using npm:

```bash
npm install xtent.js
```

---

## Basic Concepts

### 1. **Entity**
An entity is any construct (like a class, object, or factory) that you register with the store. Entities have **kinds** and **variants** that help identify them uniquely within the store.

### 2. **Store**
The `Store` is the central repository where entities are registered, stored, and managed. It allows you to define factories for creating instances of entities and ensures proper dependency injection. Additionally, the `Store` supports scoping, cloning, and context creation.

### 3. **Context**
A `Context` is a snapshot of the store at a given point in time. It acts as the environment in which entity lookups and dependency resolutions are performed. Contexts can be nested, and each context is linked to a particular scope within the store.

---

Also see [Plugin System Example](./examples/plugin-system)


## Store API Overview

### 1. `Store.add()`
This method registers an entity or a class-based factory function to the store. You can specify dependencies that need to be injected into the entity's constructor.

**Example:**
```ts
class Renderer {
  constructor() {
    // Initialization code
  }
  
  render() {
    console.log("Rendering...")
  }
}

store.add(Renderer);  // Adds the Renderer class as a factory to the store

const cx = store.context();
const renderer = cx.get(Renderer);
renderer.render();  // Output: Rendering...
```

### 2. `Store.insert()`
Registers an already existing entity or object directly into the store.

```ts
const config = { dbUrl: "database_url" };
store.insert(AppConfigEntity, config);

const cx = store.context();
const appConfig = cx.get(AppConfigEntity); 
console.log(appConfig.dbUrl);  // Output: "database_url"
```

### 3. `Store.get()`
Resolves an entity by its type or identifier from the current store. This method constructs the entity if it hasn't been created yet.

```ts
const renderer = cx.get(Renderer);  // Resolves the Renderer entity
```

### 4. `Store.getAll()`
Fetches all available variants of a particular entity.

```ts
const databases = cx.getAll(DatabaseEntity);  // Returns all available database variants
```

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

## Advanced Entity Registration with `EditStore`

The `EditStore` class provides an enhanced interface for registering and managing entities. It extends the basic functionality of the `Store` class by allowing more control over entity scoping, dependency injection, and overriding behavior.

### Key Methods in `EditStore`:

#### 1. `scope(EntityScope)`
- Sets a specific scope for registering entities.

```ts
const customScope = scope("custom-scope");
store.scope(customScope).add(Renderer);
```

#### 2. `add(Class, ...dependencies)`
- Adds a class as a factory method to the store, optionally providing dependencies that will be injected into the constructor.

```ts
store.add(Renderer, [AppConfigEntity]);  // Renderer requires AppConfig as a dependency
```

#### 3. `use(Entity, implementation, ...dependencies)`
- Registers an implementation of an entity, either as an object, a class, or a factory function. This method also allows for injecting dependencies into the implementation.

```ts
store.use(DatabaseEntity, SqlDatabase, [AppConfigEntity]);
```

#### 4. `override(Entity, implementation, ...dependencies)`
- Overrides an existing entity with a new implementation or factory function. This is useful when you want to replace the default behavior of an entity at runtime.

```ts
store.override(DatabaseEntity, NoSqlDatabase, [AppConfigEntity]);
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
  process.env.dev ? ConfigEntity("dev") : ConfigEntity("prod")
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


## Context Class

### Description

The `Context` class is responsible for resolving entities and managing their dependencies. It supports hierarchical resolution by allowing a context to have a parent.

### Key Features

- **Dependency Resolution**: Automatically resolves and instantiates dependencies.
- **Optional Retrieval**: Supports fetching entities that may or may not exist.
- **Entity Pooling**: Caches instances of resolved entities to avoid repeated instantiation.

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

#### `getAll`

Retrieves all instances of a specific entity type.

```javascript
const instances = context.getAll(entity, options);
```

- **Parameters**:
  - `entity`: The entity to resolve.
  - `options`: Optional configuration for resolution.

- **Returns**: A `Map` of entity variants to their resolved instances.

#### `getOptional`

Retrieves an instance of an entity, returning `null` if not found.

```javascript
const instance = context.getOptional(entity, options);
```

- **Parameters**:
  - `entity`: The entity to resolve.
  - `options`: Optional configuration for resolution.

- **Returns**: The resolved entity instance or `null`.

### Example Usage

```javascript
// Create a new context
const context = new BaseContext(store, 'myScope', null);

// Resolve an instance of MyEntity
const myEntityInstance = context.get(MyEntity);
console.log(myEntityInstance);

// Resolve all instances of an entity type
const allInstances = context.getAll(MyEntity);
console.log(allInstances);
```

## Error Handling

The following errors may be thrown during entity resolution:

- **EntityNotFoundError**: Thrown when an entity cannot be found in the store.
- **CircularDependencyError**: Thrown when a circular dependency is detected during resolution.
- **MissingDependencyError**: Thrown when a required dependency for an entity is missing.



---

## Example: Plugin System

Here’s an example of how `xtent.js` can be used to implement a plugin-based system with a modular design.

```ts
import { Store, entity, type Context } from "xtent.js";

interface Database {
  type: string; 
}

interface Plugin {
  register(store: Store): void;
}

class App {
  static defaultPlugins: Plugin[] = [MockDatabase];
  static defaultConfig: AppConfig = { dbUrl: "..." };
  cx: Context;

  constructor(plugins: Plugin[] = []) {
    const store = new Store();

    store.insert(AppConfigEntity, App.defaultConfig);

    const allPlugins: Plugin[] = [...App.defaultPlugins, ...plugins];

    for (const plugin of allPlugins) {
      plugin.register(store);
    }

    this.cx = store.context();
  }

  get database() {
    return this.cx.get(DatabaseEntity);
  }
}

console.log(new App().database.type);  // Output: MOCK
console.log(new App([SqlDatabase]).database.type);  // Output: SQL
```

In this example, plugins like `MockDatabase`, `SqlDatabase`, and `NoSqlDatabase` are dynamically registered and resolved by the store, making the app flexible and extendable.

---








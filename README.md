# `xtent.js` - Simple and Flexible Dependency Injection for JavaScript

This library provides a lightweight and easy-to-use dependency injection system for managing entities and their lifecycles in JavaScript applications. Whether you're building complex applications or simple ones, `xtent.js` helps you manage dependencies and systems efficiently.

## Features

- **Simple API** for managing dependencies and entities
- **Lazy Initialization** of systems and services
- **Contextual Lookups** to get entities when needed
- **Automatic Dependency Resolution** between entities

## Installation

```bash
npm install xtent.js
```

## Basic Usage

Here’s a simple example to show how `xtent.js` can be used in an application.

### Example: Managing Systems

In this example, we'll manage two simple systems: `Logger` and `UserService`. The `UserService` depends on the `Logger`.

```ts
import { Store, entity } from 'xtent.js';

// Define entities
const LoggerId = entity<Logger>('Logger');
const UserServiceId = entity<UserService>('UserService');

// Define a Logger system
class Logger {
  log(message: string) {
    console.log('[LOG]:', message);
  }
}

// Define a UserService that depends on Logger
class UserService {
  constructor(private logger: Logger) {}

  getUser() {
    this.logger.log('Fetching user data...');
    return { id: 1, name: 'John Doe' };
  }
}

// Create a store to manage our systems
const store = new Store();

// Add systems to the store with dependency injection
store.use(LoggerId, Logger);
store.add(UserService, [LoggerId]);

// Create a context to access systems
const cx = store.context();

// Access and use the UserService system
const userService = cx.get(UserServiceId);
const user = userService.getUser();
console.log('User:', user);
```

### Output

```
[LOG]: Fetching user data...
User: { id: 1, name: 'John Doe' }
```

Comprehensive example coming soon 🙇

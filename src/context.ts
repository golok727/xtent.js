import type { Store } from './store';

export abstract class Context {
  get<T>(): T {
    throw new Error('not implemented');
  }

  getAll<T>(): T[] {
    throw new Error('not implemented');
  }

  getOptional<T>(): T | null {
    throw new Error('not implemented');
  }
}

export class BasicContext extends Context {
  constructor(public store: Store) {
    super();
  }
}

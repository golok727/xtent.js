import type { Store } from './store';

export abstract class Provider {
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

export class ExtensionProvider extends Provider {
  constructor(public store: Store) {
    super();
  }
}

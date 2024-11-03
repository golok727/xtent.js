import type { Context } from './context';
import type { Store } from './store';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type EntityFactory<T = any> = (provider: Context) => T;
export type EntityVariant = string;

export interface Extension {
  init(store: Store): void;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AnyAbstractConstructor<T = any> = abstract new (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ...args: any
) => T;

export type Entity<T> = {
  type: string;
  variant: string;
  __ty__: T;
};

export type AnyEntity<T> = AnyAbstractConstructor<T> | Entity<T>;

export type InferEntityType<T> = T extends Entity<infer V>
  ? V
  : T extends AnyAbstractConstructor<infer V>
    ? V
    : never;

import type { Provider } from './provider';
import type { Store } from './store';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type ExtensionFactory<T = any> = (provider: Provider) => T;
export type ExtensionVariant = string;

export interface Extension {
  init(store: Store): void;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type AbstractExtensionConstructor<T = any> = abstract new (
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  ...args: any
) => T;

export type ExtensionId<T> = {
  type: string;
  variant: string;
  __ty__: T;
};

export type AnyExtensionId<T> =
  | AbstractExtensionConstructor<T>
  | ExtensionId<T>;

export type InferExtensionType<T> = T extends ExtensionId<infer V>
  ? V
  : T extends AbstractExtensionConstructor<infer V>
    ? V
    : never;

import type { Context } from './context';

// biome-ignore lint/suspicious/noExplicitAny: Thanks biome
export type Any = any;

export type EntityFactoryFn<T = Any> = (ctx: Context) => T;
export type EntityVariant = string;
export type EntityKind = string;
export type EntityScope = string[] & {
  __brand__: 'EntityScope';
  stringify(): string;
};

export type AnyAbstractConstructor<T = Any> = abstract new (...args: Any) => T;

export type Entity<T> = {
  kind: EntityKind;
  variant: string;
  __ty__: T;
};

export type EntityLike<T> = AnyAbstractConstructor<T> | Entity<T>;

export type EntityType<T> = T extends Entity<infer V>
  ? V
  : T extends AnyAbstractConstructor<infer V>
    ? V
    : never;

export type Dependencies<T extends Any[]> = {
  [i in keyof T]:
    | EntityLike<T[i]>
    | (T[i] extends (infer I)[] ? [Entity<I>] : never);
};

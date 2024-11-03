import { STORE_ROOT_SCOPE } from './const';
import { BaseContext, type Context } from './context';
import { normalizeEntityIdentifier } from './entity';
import type {
  Any,
  AnyAbstractConstructor,
  Dependencies,
  Entity,
  EntityFactoryFn,
  EntityKind,
  EntityLike,
  EntityScope,
  EntityVariant,
  InferEntityType,
} from './types';
import { buildFactoryFunction } from './utils';

export function scope(
  name: string,
  base: EntityScope = STORE_ROOT_SCOPE
): EntityScope {
  return Object.assign([...base, name], {
    stringify(this: string[]) {
      return this.join('/');
    },
  }) as never;
}

export interface AddFactoryOptions {
  scope?: EntityScope;
  override?: boolean;
}

export type VariantMap = Map<EntityVariant, EntityFactoryFn>;
export type EntityMap = Map<EntityKind, VariantMap>;
export class Store {
  registry = new Map<
    string, // scope
    EntityMap
  >();

  get add() {
    return new EditStore(this).add;
  }

  get use() {
    return new EditStore(this).use;
  }

  get scope() {
    return new EditStore(this).scope;
  }

  clone(): Store {
    const store = new Store();
    for (const [scope, entities] of this.registry) {
      const s = new Map();
      for (const [identifier, variants] of entities) {
        s.set(identifier, new Map(variants));
      }
      store.registry.set(scope, s);
    }
    return store;
  }

  insert<T>(ent: EntityLike<T>, value: T, options?: AddFactoryOptions) {
    this.factory(ent, () => value, options);
  }

  factory<T = Any>(
    ent: EntityLike<T>,
    factory: EntityFactoryFn,
    options?: AddFactoryOptions
  ) {
    const { variant, kind } = normalizeEntityIdentifier<T>(ent);

    const scope = (options?.scope ?? STORE_ROOT_SCOPE).stringify();

    const entities: EntityMap = this.registry.get(scope) ?? new Map();

    const variants: VariantMap = entities.get(kind) ?? new Map();

    if (variants.has(variant) && !options?.override)
      throw new Error(
        `Already exists: Variant: "${variant}" for Entity: "${kind}" at Scope: "${scope}"`
      );

    variants.set(variant, factory);
    entities.set(kind, variants);
    this.registry.set(scope, entities);
  }

  get<T>(ent: Entity<T>, scope = STORE_ROOT_SCOPE): EntityFactoryFn<T> | null {
    return (
      this.registry.get(scope.stringify())?.get(ent.kind)?.get(ent.variant) ??
      null
    );
  }

  getAll<T>(
    ent: Entity<T>,
    scope = STORE_ROOT_SCOPE
  ): Map<EntityVariant, EntityFactoryFn<T>> {
    return new Map(this.registry.get(scope.stringify())?.get(ent.kind));
  }

  context(scope = STORE_ROOT_SCOPE, parent: Context | null = null) {
    return new BaseContext(this, scope, parent);
  }
}

class EditStore {
  private _scope = STORE_ROOT_SCOPE;

  constructor(private readonly store: Store) {}

  scope = (scope: EntityScope) => {
    this._scope = scope;
    return this;
  };

  add = <
    Cstr extends new (
      ...args: Any
    ) => Any,
    const D extends Dependencies<ConstructorParameters<Cstr>> = Dependencies<
      ConstructorParameters<Cstr>
    >,
  >(
    cstr: Cstr,
    ...[deps]: D extends [] ? [] : [D]
  ): this => {
    this.store.factory(cstr, buildFactoryFunction(cstr, deps), {
      scope: this._scope,
    });

    return this;
  };

  use = <
    E extends Entity<Any>,
    Item extends
      | EntityFactoryFn<Interface>
      | Interface
      | AnyAbstractConstructor<Interface>,
    Interface = InferEntityType<E>,
    D extends Item extends AnyAbstractConstructor<Interface>
      ? Dependencies<ConstructorParameters<Item>>
      : [] = Item extends AnyAbstractConstructor<Interface>
      ? Dependencies<ConstructorParameters<Item>>
      : [],
  >(
    ent: E,
    anyItem: Item,
    ...[deps]: D extends [] ? [] : [D]
  ): this => {
    if (anyItem instanceof Function) {
      this.store.factory(ent, buildFactoryFunction(anyItem, deps), {
        scope: this._scope,
      });
    } else {
      this.store.insert(ent, anyItem, { scope: this._scope });
    }
    return this;
  };
}

import { normalizeEntityIdentifier, stringifyEntity } from './entity';
import type { Store } from './store';
import type {
  Any,
  Entity,
  EntityLike,
  EntityScope,
  EntityVariant,
} from './types';

export interface ResolverOptions {
  sameScope?: boolean;
  optional?: boolean;
}

export abstract class Context {
  abstract store: Store;
  get<T>(ent: EntityLike<T>, options?: ResolverOptions): T {
    return this.resolve<T>(normalizeEntityIdentifier(ent), {
      ...options,
      optional: false,
    });
  }

  getAll<T>(
    ent: EntityLike<T>,
    options?: ResolverOptions & { exclude?: EntityVariant[] }
  ): Map<EntityVariant, T> {
    return this.resolveAll<T>(normalizeEntityIdentifier(ent), {
      ...options,
      optional: false,
    });
  }

  getOptional<T>(ent: EntityLike<T>, options?: ResolverOptions): T | null {
    return this.resolve<T>(normalizeEntityIdentifier(ent), {
      ...options,
      optional: true,
    });
  }

  abstract resolve<T>(ent: Entity<T>, options?: ResolverOptions): Any;

  abstract resolveAll<T>(
    ent: Entity<T>,
    options?: ResolverOptions & { exclude?: EntityVariant[] }
  ): Map<EntityVariant, T>;
}

class EntityPool {
  pool = new Map<string, Map<EntityVariant, Any>>();

  getOrInsert<T>(ent: Entity<T>, insert: () => Any) {
    const variantMap = this.pool.get(ent.kind) ?? new Map();
    if (!variantMap.has(ent.variant)) {
      variantMap.set(ent.variant, insert());
    }
    const variant = variantMap.get(ent.variant);
    this.pool.set(ent.kind, variantMap);
    return variant;
  }
}

export class EntityNotFoundError extends Error {
  constructor(
    public ent: Entity<unknown>,
    scope: string
  ) {
    super(`${stringifyEntity(ent)} not found at scope: '${scope}'`);
  }
}

export class CircularDependencyError extends Error {
  constructor(caught: Entity<unknown>, stack: Array<Entity<unknown>>) {
    const cir =
      stack.map(stringifyEntity).join(' -> ') +
      ' -> ' +
      stringifyEntity(caught);
    super(cir);
  }
}

export class MissingDependencyError extends Error {
  constructor(missing: Entity<unknown>, forEnt: Entity<Any>) {
    super(
      `Missing Dependency ${stringifyEntity(missing)} for ${stringifyEntity(forEnt)}`
    );
  }
}

class Resolver extends Context {
  resolve<T>(
    ent: Entity<T>,
    { sameScope = false, optional = false }: ResolverOptions = {}
  ): T | null {
    const createEntity = this.store.get(ent, this.context.scope);
    if (!createEntity) {
      if (!sameScope && this.context.parent) {
        return this.context.parent.resolve(ent, { sameScope, optional });
      }

      if (optional) return null;
      throw new EntityNotFoundError(ent, this.context.scope.stringify());
    }

    return this.context.pool.getOrInsert(ent, () => {
      const next = this.next(ent);

      try {
        return createEntity(next);
      } catch (err) {
        if (err instanceof EntityNotFoundError) {
          throw new MissingDependencyError(err.ent, ent);
        }
        throw err;
      }
    });
  }

  resolveAll<T>(
    ent: Entity<T>,
    {
      sameScope = false,
      optional = false,
      exclude = [],
    }: ResolverOptions & { exclude?: EntityVariant[] } = {}
  ): Map<EntityVariant, T> {
    const entFactories = this.context.store.getAll(ent, this.context.scope);

    if (entFactories.size === 0) {
      if (this.context.parent && !sameScope) {
        return this.context.parent.getAll(ent, {
          sameScope,
          optional,
          exclude,
        });
      }
      return new Map();
    }

    const res = new Map<string, T>();

    for (const e of exclude) entFactories.delete(e);

    for (const [variant, createEntity] of entFactories) {
      const created = this.context.pool.getOrInsert(
        { kind: ent.kind, variant } as Entity<T>,
        () => {
          const next = this.next(ent);
          try {
            return createEntity(next);
          } catch (err) {
            if (err instanceof EntityNotFoundError) {
              throw new MissingDependencyError(err.ent, {
                kind: ent.kind,
                variant,
              } as Entity<T>);
            }
            throw err;
          }
        }
      );
      res.set(variant, created);
    }

    return res;
  }

  private next<T>(ent: Entity<T>) {
    const level = this.level + 1;
    if (level > 100) throw new Error('Max recursion limit reached');

    if (
      this.stack.find(e => e.kind === ent.kind && e.variant === ent.variant)
    ) {
      throw new CircularDependencyError(ent, this.stack);
    }

    return new Resolver(this.context, this.level + 1, [...this.stack, ent]);
  }

  store: Store = this.context.store;

  constructor(
    public readonly context: BaseContext,
    public readonly level = 0,
    public readonly stack: Entity<Any>[] = []
  ) {
    super();
  }
}

export class BaseContext extends Context {
  resolve<T>(ent: Entity<T>, options?: ResolverOptions): T {
    return new Resolver(this).resolve(ent, options) as T;
  }

  resolveAll<T>(
    ent: Entity<T>,
    options?: ResolverOptions & { exclude?: EntityVariant[] }
  ): Map<EntityVariant, T> {
    return new Resolver(this).resolveAll(ent, options);
  }

  pool = new EntityPool();

  public readonly store: Store;
  constructor(
    store: Store,
    public readonly scope: EntityScope,
    public readonly parent: Context | null
  ) {
    super();
    this.store = store.clone();
    this.store.insert(Context, this, { scope, override: true });
  }
}

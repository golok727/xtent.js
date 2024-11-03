import { ENTITY_VARIANT_DEFAULT } from './const';
import type {
  AnyAbstractConstructor,
  Entity,
  EntityLike,
  EntityVariant,
} from './types';

// biome-ignore lint/suspicious/noExplicitAny: Thanks biome
type Any = any;

export function entity<T>(
  type: string,
  variant: EntityVariant = ENTITY_VARIANT_DEFAULT
): Entity<T> & ((variant: EntityVariant) => Entity<T>) {
  return Object.assign(
    (variant: EntityVariant) => {
      return entity(type, variant);
    },
    {
      kind: type,
      variant,
    } satisfies Omit<Entity<T>, '__ty__'>
  ) as never;
}

export function isEntityIdentifier<T = Any>(
  ent: Any
): ent is Omit<Entity<T>, '__ty__'> {
  return ent['kind'] !== undefined && ent['variant'] !== undefined;
}

export function normalizeEntityIdentifier<T>(ent: EntityLike<T>): Entity<T> {
  if (isEntityIdentifier(ent)) return ent;
  else if (typeof ent === 'function' && ent.name)
    return createEntityFromConstructor<T>(ent as AnyAbstractConstructor);
  else throw new Error('Expected a Entity');
}

export function createEntityFromConstructor<T>(
  cstr: AnyAbstractConstructor<T>
) {
  return entity<T>(`${cstr.name}`);
}

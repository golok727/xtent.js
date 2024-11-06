import { ENTITY_VARIANT_DEFAULT } from './const';
import type {
  AnyAbstractConstructor,
  Entity,
  EntityLike,
  EntityVariant,
} from './types';

const table = new WeakMap<object, string>();
let counter = 0;

function hashConstructor(cstr: { name: string }) {
  let result = table.get(cstr);
  if (result) return result;

  result = ++counter + '~' + cstr.name;

  table.set(cstr, result);

  return result;
}

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
  return entity<T>(`${cstr.name}${hashConstructor(cstr)}`);
}

export function stringifyEntity<T>(ent: Entity<T>) {
  return `Entity(${ent.kind}::${ent.variant})`;
}

export function entityIsEqual(a: Entity<unknown>, b: Entity<unknown>): boolean {
  return a.kind == b.kind && a.variant === b.variant;
}

export function isVariantOf(entity: Entity<unknown>, variant: Entity<unknown>) {
  return entity.kind === variant.kind;
}

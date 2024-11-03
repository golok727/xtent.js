import type { Entity, EntityVariant } from './types';

export const DEFAULT_EXTENSION_VARIANT = 'default';

export function entity<T>(
  type: string,
  variant: EntityVariant = DEFAULT_EXTENSION_VARIANT
): Entity<T> & ((variant: EntityVariant) => Entity<T>) {
  return Object.assign(
    (variant: EntityVariant) => {
      return entity(type, variant);
    },
    {
      type: type,
      variant,
    } satisfies Omit<Entity<T>, '__ty__'>
  ) as never;
}

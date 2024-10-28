import type { ExtensionId, ExtensionVariant } from './types';

export const DEFAULT_EXTENSION_VARIANT = 'default';

export function defineExtension<T>(
  type: string,
  variant: ExtensionVariant = DEFAULT_EXTENSION_VARIANT
): ExtensionId<T> & ((variant: ExtensionVariant) => ExtensionId<T>) {
  return Object.assign(
    (variant: ExtensionVariant) => {
      return defineExtension(type, variant);
    },
    {
      type: type,
      variant,
    } satisfies Omit<ExtensionId<T>, '__ty__'>
  ) as never;
}

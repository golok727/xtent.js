import type { EntityScope } from './types';
export const STORE_ROOT_SCOPE = Object.assign([] as string[], {
  stringify(this: string[]) {
    return this.join('/');
  },
}) as EntityScope;
export const ENTITY_VARIANT_DEFAULT = 'default';

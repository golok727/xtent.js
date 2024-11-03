import { describe, expect, test } from 'vitest';
import { entity } from '../src';
import { isEntityIdentifier } from '../src/entity';

abstract class System {
  abstract init(): void;
  abstract dispose(): void;
}

export const AnySystem = entity<System>('System');
export const ContextSystemId = AnySystem('ContextSystem');
export const GraphicsSystemId = AnySystem('GraphicsSystem');

describe('Store', () => {
  test('insert', () => {
    expect(1).toBe(1);
  });

  test('isEntityIdentifier', () => {
    expect(isEntityIdentifier(AnySystem)).toBe(true);
    expect(isEntityIdentifier(ContextSystemId)).toBe(true);
    expect(isEntityIdentifier({ thing: 2 })).toBe(false);
  });

  test('id', () => {
    const thing = entity('thing');
    expect(thing).toBeTypeOf('function');

    expect(thing.kind).toBe('thing');
    expect(thing.variant).toBe('default');

    const variant = thing('variant');
    expect(variant).toBeTypeOf('function');
    expect(variant.kind).toBe('thing');
    expect(variant.variant).toBe('variant');
  });
});

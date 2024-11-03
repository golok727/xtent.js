import { describe, expect, test } from 'vitest';
import { entity } from '../src';

abstract class System {
  init() {
    console.log('init');
  }
  dispose() {
    console.log('init');
  }
}

export const RendererSystem = entity<System>('Systems');
export const ContextSystem = RendererSystem('Context');
export const BackgroundSystem = RendererSystem('Background');

describe('Store', () => {
  test('insert', () => {
    expect(1).toBe(1);
  });

  test('id', () => {
    const thing = entity('thing');
    expect(thing).toBeTypeOf('function');

    expect(thing.type).toBe('thing');
    expect(thing.variant).toBe('default');

    const variant = thing('variant');
    expect(variant).toBeTypeOf('function');
    expect(variant.type).toBe('thing');
    expect(variant.variant).toBe('variant');
  });
});

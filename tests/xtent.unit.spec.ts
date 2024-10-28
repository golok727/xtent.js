import { describe, expect, test } from 'vitest';
import { defineExtension } from '../src';

describe('Store', () => {
  test('insert', () => {
    expect(1).toBe(1);
  });

  test('id', () => {
    const thing = defineExtension('thing');
    expect(thing).toBeTypeOf('function');

    expect(thing.type).toBe('thing');
    expect(thing.variant).toBe('default');

    const variant = thing('variant');
    expect(variant).toBeTypeOf('function');
    expect(variant.type).toBe('thing');
    expect(variant.variant).toBe('variant');
  });
});

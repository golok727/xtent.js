import { describe, expect, test } from 'vitest';
import { Store } from '../src';

describe('Store', () => {
  test('add', () => {
    const s = new Store();
    expect(s.add()).toBe(true);
  });
});

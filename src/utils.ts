import type { Context } from './context';
import type { Any, EntityFactoryFn } from './types';

export function isConstructor(v: unknown) {
  try {
    Reflect.construct(
      function () {
        /* NOOP */
      },
      [],
      v as never
    );
    return true;
  } catch (_) {
    return false;
  }
}

export function buildFactoryFunction(
  cstr: Any,
  dependencies: Any[] = []
): EntityFactoryFn<Any> {
  return (cx: Context) => {
    const args = [] as Any[];
    for (const dependency of dependencies) {
      let arrayPattern;
      let ent;

      if (Array.isArray(dependency)) {
        if (dependency.length !== 1) {
          throw new Error(
            `Dependency get array pattern should only have one element got ${dependency.length}`
          );
        }
        arrayPattern = true;
        ent = dependency[0];
      } else {
        arrayPattern = false;
        ent = dependency;
      }
      if (arrayPattern) {
        args.push(Array.from(cx.getAll(ent).values()));
      } else {
        args.push(cx.get(ent));
      }
    }

    if (isConstructor(cstr)) {
      return new cstr(...args, cx);
    } else {
      // todo allow (cx ,...deps) => T
      return cstr(...args, cx);
    }
  };
}

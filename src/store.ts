import type { ExtensionFactory, ExtensionId, ExtensionVariant } from './types';

export class Store {
  /*
  {
    'scope' => {
    "type": {
    "variant": Factory
    ...
    } 
    ...
    }
  }
   */
  items = new Map<
    string,
    Map<string, Map<ExtensionVariant, ExtensionFactory>>
  >();

  get insert() {
    return new EditStore(this).insert;
  }

  addExtensionFactory() {
    //
  }
}

class EditStore {
  constructor(public store: Store) {}

  insert<T>(id: ExtensionId<T>, factory: unknown) {
    console.log(id);
    console.log(factory);
    return true;
  }
}

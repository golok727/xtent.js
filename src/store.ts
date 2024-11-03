import { BasicContext } from './context';
import type { EntityFactory, EntityVariant } from './types';

export class Store {
  extensions = new Map<
    string,
    Map<string, Map<EntityVariant, EntityFactory>>
  >();

  get add() {
    return new EditStore(this).add;
  }

  addFactory() {
    //
  }

  createContext() {
    return new BasicContext(this);
  }
}

class EditStore {
  constructor(public store: Store) {}

  add() {
    //
  }

  bind() {
    //
  }
}

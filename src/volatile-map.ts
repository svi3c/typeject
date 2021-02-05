/// <reference path="./types.d.ts" />

export class VolatileMap<K, V extends {}> {
  private map = new Map<K, WeakRef<V>>();
  set(k: K, v: V) {
    this.map.set(k, new WeakRef(v));
    return this;
  }
  get(k: K) {
    return this.map.get(k)?.deref() ?? null;
  }
}

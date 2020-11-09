declare class WeakRef<V> {
  constructor(v: V);
  deref(): V | undefined;
}

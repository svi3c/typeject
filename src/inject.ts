type Key = string | number | symbol;
type Factory<T, X> = (injector: Injector<T>) => X;
type Injector<T> = { [K in keyof T]: () => T[K] };

export class Module<T extends {} = {}> {
  readonly injector = {} as Injector<T>;

  add<
    T1 = {},
    T2 = {},
    T3 = {},
    T4 = {},
    T5 = {},
    T6 = {},
    T7 = {},
    T8 = {},
    T9 = {},
    T10 = {}
  >(
    ...deps: [
      Module<T1>?,
      Module<T2>?,
      Module<T3>?,
      Module<T4>?,
      Module<T5>?,
      Module<T6>?,
      Module<T7>?,
      Module<T8>?,
      Module<T9>?,
      Module<T10>?
    ]
  ): Module<T & T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10> {
    Object.assign(this.injector, ...deps.map((dep) => dep!.injector));
    return this as Module<any>;
  }
  value<K extends Key, X>(name: K, value: X) {
    return this._add(name, () => value);
  }
  prototype<K extends Key, X>(name: K, factory: Factory<T, X>) {
    return this._add(name, () => factory(this.injector));
  }
  singleton<K extends Key, X>(name: K, factory: Factory<T, X>) {
    return this._add(name, () => {
      const instance = factory(this.injector);
      this.value(name, instance);
      return instance;
    });
  }
  volatile<K extends Key, X>(
    name: K,
    factory: Factory<T, X>
  ): Module<T & { [key in K]: X }> {
    if (typeof WeakRef === "function") {
      let ref: WeakRef<X>;
      return this._add(name, () => {
        let instance = ref?.deref();
        if (instance === undefined) {
          instance = factory(this.injector);
          ref = new WeakRef(instance);
        }
        return instance;
      });
    }
    return this.singleton(name, factory);
  }

  private _add<K extends Key, X>(name: K, accessor: () => X) {
    (this.injector as any)[name] = accessor;
    return (this as any) as Module<T & { [key in K]: X }>;
  }
}

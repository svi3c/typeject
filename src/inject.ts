import { VolatileMap } from "./volatile-map";

type Factory<T, X> = (injector: Injector<T>) => X;
type Key = string | number | symbol;
type Factories<T> = Map<keyof T, Factory<any, T>>;
type Injector<T> = <K extends keyof T>(k: K) => T[K];

const volatileEnabled = typeof WeakRef === "function";

export class Module<T extends {} = {}> {
  private _pF = new Map<keyof T, Factory<T, any>>();
  private _sF = new Map<keyof T, Factory<T, any>>();
  private _vF = new Map<keyof T, Factory<T, any>>();

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
    ...children: [
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
    const mod = this as Module<any>;
    for (const child of children) {
      (child as Module<any>)._pF.forEach((v, k) => mod._pF.set(k, v));
      (child as Module<any>)._sF.forEach((v, k) => mod._sF.set(k, v));
      (child as Module<any>)._vF.forEach((v, k) => mod._vF.set(k, v));
    }
    return mod;
  }
  value<K extends Key, X>(name: K, value: X) {
    return this._add(this._sF, name, () => value);
  }
  prototype<K extends Key, X>(name: K, factory: Factory<T, X>) {
    return this._add(this._pF, name, factory);
  }
  singleton<K extends Key, X>(name: K, factory: Factory<T, X>) {
    return this._add(this._sF, name, factory);
  }
  volatile<K extends Key, X>(name: K, factory: Factory<T, X>) {
    return this._add(volatileEnabled ? this._vF : this._sF, name, factory);
  }
  createInjector() {
    return createInjector(this._pF, this._sF, this._vF);
  }

  private _add<K extends Key, X>(
    factories: Map<keyof T, Factory<T, any>>,
    name: K,
    factory: Factory<T, X>
  ) {
    (factories as Map<K | keyof T, Factory<any, any>>).set(name, factory);
    return (this as any) as Module<T & { [key in K]: X }>;
  }
}

function createInjector<T extends {}>(
  pF: Factories<T>,
  sF: Factories<T>,
  vF: Factories<T>
): Injector<T> {
  const sI = new Map<keyof T, any>();
  const vI = new VolatileMap<keyof T, any>();

  return injector;

  function injector<K extends keyof T>(name: K): T[K] {
    return get(vF, name, vI) ?? get(sF, name, sI, true) ?? get(pF, name);
  }

  function get(
    factories: Map<keyof T, Factory<T, any>>,
    name: keyof T,
    instances?: Map<keyof T, any> | VolatileMap<keyof T, any>,
    removeFactory = false
  ) {
    let instance = instances?.get(name);
    if (instance) return instance;
    const factory = factories.get(name);
    if (!factory) return null;
    instance = factory(injector);
    instances?.set(name, instance);
    if (removeFactory) factories.delete(name);
    return instance;
  }
}

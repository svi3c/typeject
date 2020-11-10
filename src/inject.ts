import { VolatileMap } from "./volatile-map";

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export type Injector<T> = <K extends keyof T>(token: K) => T[K];

type Factory<T, K extends keyof T, D = T> = (
  injector: Injector<Omit<D, K>>
) => T[K];
type Volatile<T, K extends keyof T, D = T> = [
  Factory<T, K, D>,
  "v" | "volatile" | void
];
type Prototype<T, K extends keyof T, D = T> = [
  Factory<T, K, D>,
  "p" | "prototype"
];
type Singleton<T, K extends keyof T, D = T> = [
  Factory<T, K, D>,
  "s" | "singleton"
];
type Provider<T, K extends keyof T, D = T> =
  | Volatile<T, K, D>
  | Prototype<T, K, D>
  | Singleton<T, K, D>;

export type Module<T, D = T> = {
  [K in keyof T]: Provider<T, K, D>;
};

export function createInjector<T>(module: Module<T>): Injector<T> {
  const prototypes = new Map<keyof T, any>();
  const singletonFactories = new Map<keyof T, any>();
  const singletons = new Map<keyof T, any>();
  const volatileFactories = new Map<keyof T, any>();
  const volatiles =
    typeof WeakRef === "function"
      ? new VolatileMap<keyof T, any>()
      : new Map<keyof T, any>();
  // tslint:disable-next-line: forin
  for (const token in module) {
    const provider = module[token];
    if (isVolatile(provider)) {
      volatileFactories.set(token, provider[0]);
    } else if (isSingleton(provider)) {
      singletonFactories.set(token, provider[0]);
    } else if (isPrototype(provider)) {
      prototypes.set(token, provider[0]);
    }
  }
  const injector = <K extends keyof T>(token: K): T[K] => {
    if (volatiles.has(token)) {
      return volatiles.get(token);
    }
    if (singletons.has(token)) {
      return singletons.get(token);
    }
    if (volatileFactories.has(token)) {
      const value = volatileFactories.get(token)(injector);
      volatiles.set(token, value);
      return value;
    }
    if (singletonFactories.has(token)) {
      const value = singletonFactories.get(token)(injector);
      singletons.set(token, value);
      singletonFactories.delete(token);
      return value;
    }
    if (prototypes.has(token)) {
      return prototypes.get(token)();
    }
    throw Error(`Missing provider for '${token}'`);
  };

  return injector;
}

const isSingleton = <T, K extends keyof T>(
  provider: Provider<T, K>
): provider is Singleton<T, K> =>
  Array.isArray(provider) && (provider as Singleton<T, K>)[1][0] === "s";

const isPrototype = <T, K extends keyof T>(
  provider: Provider<T, K>
): provider is Prototype<T, K> =>
  Array.isArray(provider) && (provider as Prototype<T, K>)[1][0] === "p";

const isVolatile = <T, K extends keyof T>(
  provider: Provider<T, K>
): provider is Volatile<T, K> =>
  Array.isArray(provider) && (provider as Prototype<T, K>)[1][0] === "v";

export function createModule<T>(
  module: Module<T, UnionToIntersection<T>>,
  ...modules: Array<Module<T, UnionToIntersection<T>>>
): Module<UnionToIntersection<T>> {
  return Object.assign(module, ...modules);
}

export const singleton = <T, K extends keyof T, D = T>(
  factory: Factory<T, K, D>
): Singleton<T, K, D> => [factory, "s"];
export const prototype = <T, K extends keyof T, D = T>(
  factory: Factory<T, K, D>
): Prototype<T, K, D> => [factory, "p"];
export const volatile = <T, K extends keyof T, D = T>(
  factory: Factory<T, K, D>
): Volatile<T, K, D> => [factory, "v"];
export const s = singleton;
export const p = prototype;
export const v = volatile;

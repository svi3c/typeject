import { VolatileMap } from "./volatile-map";

type Injector<T> = <K extends keyof T>(token: K) => T[K];

type Factory<T, K extends keyof T> = (injector: Injector<Omit<T, K>>) => T[K];
type Volatile<T, K extends keyof T> =
  | Factory<T, K>
  | [Factory<T, K>, "v" | "volatile" | void];
type Prototype<T, K extends keyof T> = [Factory<T, K>, "p" | "prototype"];
type Singleton<T, K extends keyof T> = [Factory<T, K>, "s" | "singleton"];
type Provider<T, K extends keyof T> =
  | Volatile<T, K>
  | Prototype<T, K>
  | Singleton<T, K>;
type OnlyObjects<T> = { [K in keyof T]: T[K] extends object ? T[K] : never };
export type Context<T> = {
  [K in keyof T]: Provider<T, K>;
};

export function createInjector<T extends OnlyObjects<T>>(
  declaration: Context<T>
) {
  const prototypes = new Map<keyof T, any>();
  const singletonFactories = new Map<keyof T, any>();
  const volatileFactories = new Map<keyof T, any>();
  const singletons = new Map<keyof T, any>();
  const volatiles =
    typeof WeakRef === "function"
      ? new VolatileMap<keyof T, any>()
      : new Map<keyof T, any>();
  // tslint:disable-next-line: forin
  for (const token in declaration) {
    const provider = declaration[token];
    if (isVolatile(provider)) {
      volatileFactories.set(
        token,
        Array.isArray(provider) ? provider[0] : provider
      );
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
  !Array.isArray(provider) || (provider as Prototype<T, K>)[1][0] === "v";

export const toContext = <T extends OnlyObjects<T>>(context: Context<T>) =>
  context;

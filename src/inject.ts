type Injector<T> = <K extends keyof T>(token: K) => T[K];

type Factory<T, K extends keyof T> = (injector: Injector<Omit<T, K>>) => T[K];
type Prototype<T, K extends keyof T> = ["prototype", Factory<T, K>];
type Singleton<T, K extends keyof T> = ["singleton", Factory<T, K>];
type Provider<T, K extends keyof T> =
  | Factory<T, K>
  | Prototype<T, K>
  | Singleton<T, K>;

export function createInjector<T extends {}>(
  declaration: {
    [K in keyof T]: Provider<T, K>;
  }
) {
  const prototypes = new Map<keyof T, any>();
  const factories = new Map<keyof T, any>();
  const singletons = new Map<keyof T, any>();
  // tslint:disable-next-line: forin
  for (const key in declaration) {
    const provider = declaration[key];
    if (isSingleton(provider)) {
      factories.set(key, provider[1]);
    } else if (isPrototype(provider)) {
      prototypes.set(key, provider[1]);
    } else {
      factories.set(key, provider);
    }
  }
  const injector = <K extends keyof T>(token: K) => {
    if (singletons.has(token)) {
      return singletons.get(token);
    }
    if (factories.has(token)) {
      const value = factories.get(token)(injector);
      singletons.set(token, value);
      factories.delete(token);
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
  (provider as Singleton<T, K>)[0] === "singleton";

const isPrototype = <T, K extends keyof T>(
  provider: Provider<T, K>
): provider is Prototype<T, K> =>
  (provider as Prototype<T, K>)[0] === "prototype";

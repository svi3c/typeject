export const singleton = <T>(factory: () => T) => {
  let instance: T;
  return () => (instance ??= factory());
};

export const volatile = <T>(factory: () => T) => {
  if (typeof WeakRef === "function") {
    let ref: WeakRef<T>;
    return () => {
      let instance = ref?.deref();
      if (instance === undefined) {
        instance = factory();
        ref = new WeakRef(instance);
      }
      return instance;
    };
  }
  return singleton(factory);
};

export const prototype = <T>(factory: () => T) => factory;

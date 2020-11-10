# typeject

Simple, typesafe and unobstrusive dependency injection

## Why another dependency injection library for TypeScript?

I was looking for a dependency injection framework that fulfills those criterias:

1. It should be very small
2. It should be unobstrusive (no decorator and metadata voodoo)
3. It should be easily and intuitively configurable
4. It should be type-safe

When looking around, I only found libraries like [inversify](https://www.npmjs.com/package/inversify) and [TypeDI](https://www.npmjs.com/package/typedi),
which are great, I'm sure! But for my needs it was too full-blown and I didn't want to turn on metadata generation, if not _really_ necessary, so I built my own library which matches my requirements.

## Concept

typeject is "DI by name", but it's still type safe.
All Dependencies in typeject are created lazily via providers.
There are three types of providers in this DI framework that you can use as you need.

### Singletons

Singleton providers always provide the same instance of a type.

### Prototypes

Prototype providers always provide a new instance of a type.

### Volatiles

Volatiles are similar to singletons. The difference is that the factory of each volatile is remembered and the instance is weakly referenced. This means that, as long as you keep a reference to the instance, it is kept in memory. If there are no references anymore, the instance is scheduled for garbage collection. If it was a victim of gc, the injector will create and serve a new instance from the provider's factory.

Weak references are only used, [if the environment supports it](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef#Browser_compatibility). As a fallback,
volatiles are treated as singletons.

## Example

```ts
// Types

interface IServiceA {
  state: { foo: string };
  use(): void;
}

interface IServiceB {
  useServiceA(): void;
}

// Implementation

class ServiceA implements IServiceA {
  state = { foo: "bar" };
  use(): void {
    console.log(this.state.foo);
  }
}

class ServiceB implements IServiceB {
  constructor(private serviceA: IServiceA) {}
  useServiceA() {
    this.serviceA.use();
  }
}

// Configuration (for two modules)

type InstancesA = { serviceA: IServiceA };

const moduleA = createModule<InstancesA>({
  serviceA: volatile(() => new ServiceA()),
});

type InstancesB = { serviceB: IServiceB };

const moduleB = createModule<InstancesB | InstancesA>(
  { serviceB: singleton((i) => new ServiceB(i("serviceA"))) },
  moduleA
);

// Run

const injector = createInjector(moduleB);

injector("serviceB").useServiceA();

expect(console.log).toHaveBeenCalledWith("bar");
```

## API

`createInjector<T>(module: Module<T>): Injector<T>`

Creates an injector from a given module.

`type Injector<T> = <K extends keyof T>(token: K) => T[K]`

Is used to instantiate and get instances from the module.

`createModule<T>(...modules: Module<T, UnionToIntersection<T>>): Module<UnionToIntersection<T>>`

Is used to create a module from one or multiple modules. A module is simply an object, mapping tokens to providers.

`singleton<T, K extends keyof T, D = T>(factory: Factory<T, K, D>): Singleton<T, K, D>`

Is used to create a singleton provider from the context.
Don't panic about this generic. If you use this function within a module definition, type inference will help you out (see example).

`prototype<T, K extends keyof T, D = T>(factory: Factory<T, K, D>): Prototype<T, K, D>`

Is used to create a prototype provider from the context.

`volatile<T, K extends keyof T, D = T>(factory: Factory<T, K, D>): Volatile<T, K, D>`

Is used to create a volatile provider from the context.

`type Factory<T, K extends keyof T, D = T> = (injector: Injector<Omit<D, K>>) => T[K];`

The factory is part of the providers. It passes you an injector which allows you to inject random dependencies from your module.

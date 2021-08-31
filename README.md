# typeject

Simple, typesafe and unobstrusive dependency injection

[![Build Status](https://travis-ci.com/svi3c/typeject.svg?branch=main)](https://travis-ci.com/svi3c/typeject)

## Why another dependency injection library for TypeScript?

I was looking for a dependency injection framework that fulfills those criterias:

1. It should be very small
2. It should be unobstrusive (no decorator and metadata voodoo)
3. It should be easily and intuitively configurable
4. It should be type-safe
5. It should have a very low memory footprint
6. It should be tree-shakeable

When looking around, I only found libraries like [inversify](https://www.npmjs.com/package/inversify) and [TypeDI](https://www.npmjs.com/package/typedi),
which are great, I'm sure! But for my needs it was too full-blown and I didn't want to turn on metadata generation, if not _really_ necessary, so I built my own library which matches my requirements.

## Concept

typeject is a type safe dependency injection library.
All Dependencies in typeject are created lazily via providers.
There are two types of providers in this DI framework that you can use as you need.

### Singletons

Singleton providers always provide the same instance of a type. Once a singleton is instantiated, it's factory can be garbage-collected.

### Volatiles

Volatiles are similar to singletons. The difference is that the factory of each volatile is remembered and the instance is weakly referenced. This means that, if there are no references anymore, the instance is scheduled for garbage collection. If it was garbage collected, the provider will create and serve a new instance on the next request.

Weak references are only used, [if the environment supports it](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakRef#Browser_compatibility). As a fallback,
volatiles are treated as singletons.

### Prototypes

Prototypes always provide a new instance of a factory.

### When to use which type of provider?

Here are some hints to drive your decision:

- If your instance of a factory holds state for the lifetime of the app, you should definitely use a singleton for this factory.
- If memory is a great concern and parts of your app are not used all the time, you should use volatiles. Single Page Apps for example can benefit from this approach.
- If memory is no concern and you want max performance, go for singletons.
- If you always need a fresh instance, use a prototype.

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

// Configuration

const serviceA = volatile<IServiceA>(() => new ServiceA());

const serviceB = volatile<IServiceB>(() => new ServiceB(serviceA()));

// Run

serviceB().useServiceA();
```

## API

`singleton<T>(factory: Factory<T>): () => T`

Creates a singleton provider.

`volatile<T>(factory: Factory<T>): () => T`

Creates a volatile provider.

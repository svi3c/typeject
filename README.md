# typeject

Simple, typesafe and unobstrusive dependency injection

[![Build Status](https://travis-ci.com/svi3c/typeject.svg?branch=main)](https://travis-ci.com/svi3c/typeject)

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

// Configuration

const moduleA = new Module().volatile(
  "serviceA",
  () => new ServiceA() as IServiceA
);

const moduleB = new Module()
  .add(moduleA)
  .volatile("serviceB", (i) => new ServiceB(i.serviceA()) as IServiceB);

// Run

const inject = moduleB.injector;

inject.serviceB().useServiceA();
```

## API

`new Module(): Module`

Creates a new module.

`Module.prototype.injector(): Injector`

Creates an injector from a given module.

`Module.prototype.add(...modules): Module`

Is used add modules to this module instance. This is an in-place operation.

`Module.prototype.value(name: string | number | symbol, value): Module`

Short form of Module.prototype.singleton with an already present value.

`Module.prototype.singleton(name: string | number | symbol, factory: Factory): Module`

Adds a singleton provider to the module instance (in-place).

`Module.prototype.prototype(name: string | number | symbol, factory: Factory): Module`

Adds a prototype provider to the module instance (in-place).

`Module.prototype.volatile(name: string | number | symbol, factory: Factory): Module`

Adds a volatile provider to the module instance (in-place).

`function Injector(name): value`

Is used to instantiate and get instances from the module. It holds the instances of the registered
providers. This way multiple independent injectors can be created fron a module.

`function Factory(injector): value`

The factory is part of the providers. It gets lazily called with the injector instance as parameter, so
you can make use of already defined dependencies in the module.

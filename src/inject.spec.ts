import {
  createInjector,
  createModule,
  Module,
  prototype,
  singleton,
  volatile,
} from "./inject";
import { VolatileMap } from "./volatile-map";

const mockVolatileMap = ({
  has: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
} as Partial<VolatileMap<string, {}>>) as jest.Mocked<VolatileMap<string, {}>>;

jest.mock("./volatile-map.ts", () => ({
  VolatileMap: jest.fn().mockImplementation(() => mockVolatileMap),
}));

const console = { log: jest.fn() };

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createInjector()", () => {
  it("should provide bound instances", () => {
    const inject = createInjector<{ foo: {} }>({ foo: singleton(() => ({})) });

    expect(inject("foo")).toEqual({});
  });

  it("should pass the injector to the factories to retrieve dependencies", () => {
    const inject = createInjector<{
      foo: { foo: string };
      bar: { bar: string };
    }>({
      foo: singleton(() => ({ foo: "bar" })),
      bar: singleton((i) => ({ bar: i("foo").foo.replace("r", "z") })),
    });

    expect(inject("bar").bar).toEqual("baz");
  });

  describe("volatiles", () => {
    it("should define volatiles", () => {
      const obj = {};
      const factory = jest.fn().mockImplementation(() => obj);
      const inject = createInjector<{ a: {} }>({
        a: volatile(factory),
      });
      mockVolatileMap.get.mockReturnValue(obj);
      mockVolatileMap.has.mockReturnValueOnce(false).mockReturnValueOnce(true);

      const instance1 = inject("a");
      const instance2 = inject("a");

      expect(instance1).toBe(obj);
      expect(instance1).toBe(instance2);
      expect(mockVolatileMap.set).toHaveBeenCalledWith("a", {});
      expect(mockVolatileMap.set).toHaveBeenCalledTimes(1);
      expect(mockVolatileMap.get).toHaveBeenCalledTimes(1);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should recreate volatile instances if garbage-collected", () => {
      const factory = jest.fn();
      const inject = createInjector<{ a: {} }>({
        a: volatile(factory),
      });
      mockVolatileMap.has.mockReturnValue(false);

      inject("a");
      inject("a");

      expect(mockVolatileMap.set).toHaveBeenCalledTimes(2);
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("singletons", () => {
    it("should define singletons", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = createInjector<{ a: {} }>({
        a: singleton(factory),
      });

      expect(inject("a")).toBe(inject("a"));
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("prototypes", () => {
    it("should define prototypes", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = createInjector<{ a: {} }>({
        a: prototype(factory),
      });

      expect(inject("a")).not.toBe(inject("a"));
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});

describe("createModule()", () => {
  it("should return the same object, if only one module is passed in", () => {
    const definition: Module<{ a: {} }> = { a: singleton(() => ({})) };

    const ctx: Module<{ a: {} }> = createModule(definition);

    expect(definition).toBe(ctx);
  });
  it("should return a combined module object, if multiple modules are passed in", () => {
    const definition1: Module<{ a: {} }> = { a: singleton(() => ({})) };
    const definition2: Module<{ b: {} }> = { b: singleton(() => ({})) };

    const ctx: Module<{ a: {}; b: {} }> = createModule<{ a: {} } | { b: {} }>(
      definition1,
      definition2
    );

    expect(definition1).toBe(ctx);
  });
});

describe("Examples", () => {
  it("Example 1", () => {
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
  });
});

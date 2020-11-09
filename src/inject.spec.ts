import { createInjector, createModule, Module } from "./inject";
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
    const inject = createInjector({ foo: () => ({}) });

    expect(inject("foo")).toEqual({});
  });

  it("should pass the injector to the factories to retrieve dependencies", () => {
    const inject = createInjector<{
      foo: { foo: string };
      bar: { bar: string };
    }>({
      foo: () => ({ foo: "bar" }),
      bar: (i) => ({ bar: i("foo").foo.replace("r", "z") }),
    });

    expect(inject("bar").bar).toEqual("baz");
  });

  describe("volatiles", () => {
    it("should define volatiles", () => {
      const obj = {};
      const factory = jest.fn().mockImplementation(() => obj);
      const inject = createInjector({
        a: [factory, "v"],
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

    it("should create volatiles by default", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = createInjector({
        a: factory,
      });
      mockVolatileMap.has.mockReturnValue(false);

      inject("a");

      expect(mockVolatileMap.set).toHaveBeenCalledWith("a", {});
    });

    it("should recreate volatile instances if garbage-collected", () => {
      const factory = jest.fn();
      const inject = createInjector({
        a: [factory, "v"],
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
      const inject = createInjector({
        a: [factory, "s"],
      });

      expect(inject("a")).toBe(inject("a"));
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("prototypes", () => {
    it("should define prototypes", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = createInjector({
        a: [factory, "p"],
      });

      expect(inject("a")).not.toBe(inject("a"));
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });
});

describe("toContext()", () => {
  it("should only apply the context type", () => {
    const definition = { a: () => ({}) };

    const ctx: Module<{ a: {} }> = createModule(definition);

    expect(definition).toBe(ctx);
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
      serviceA: [() => new ServiceA(), "s"],
    });

    type InstancesB = { serviceB: IServiceB };

    const moduleB = createModule<InstancesB | InstancesA>(
      { serviceB: (i) => new ServiceB(i("serviceA")) },
      moduleA
    );

    // Run

    const injector = createInjector(moduleB);

    injector("serviceB").useServiceA();

    expect(console.log).toHaveBeenCalledWith("bar");
  });
});

import { Module } from "./inject";
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

describe("Module", () => {
  describe("createInjector()", () => {
    it("should provide bound instances", () => {
      const value = {};
      const inject = new Module().value("foo", value).createInjector();

      expect(inject("foo")).toEqual({});
    });

    it("should pass the injector to the factories to retrieve dependencies", () => {
      const inject = new Module()
        .singleton("foo", () => ({ foo: "bar" }))
        .singleton("bar", (i) => ({ bar: i("foo").foo.replace("r", "z") }))
        .createInjector();

      expect(inject("bar").bar).toEqual("baz");
    });
  });

  describe("volatiles", () => {
    const WeakRef = (global as any).WeakRef;
    let M: typeof Module;

    describe("with WeakRef", () => {
      beforeEach(() => {
        (global as any).WeakRef = jest.fn();
        jest.resetModules();
        M = require("./inject").Module;
      });

      afterEach(() => ((global as any).WeakRef = WeakRef));

      it("should define volatiles", () => {
        const obj = {};
        const factory = jest.fn().mockImplementation(() => obj);
        const inject = new M().volatile("a", factory).createInjector();
        mockVolatileMap.get.mockReturnValueOnce(null).mockReturnValueOnce(obj);

        const instance1 = inject("a");
        const instance2 = inject("a");

        expect(instance1).toBe(obj);
        expect(instance1).toBe(instance2);
        expect(mockVolatileMap.set).toHaveBeenCalledWith("a", {});
        expect(mockVolatileMap.set).toHaveBeenCalledTimes(1);
        expect(mockVolatileMap.get).toHaveBeenCalledTimes(2);
        expect(factory).toHaveBeenCalledTimes(1);
      });

      it("should recreate volatile instances if garbage-collected", () => {
        const factory = jest.fn();
        const inject = new M().volatile("a", factory).createInjector();
        // mockVolatileMap.has.mockReturnValue(false);

        inject("a");
        inject("a");

        expect(mockVolatileMap.set).toHaveBeenCalledTimes(2);
        expect(factory).toHaveBeenCalledTimes(2);
      });
    });

    describe("no WeakRef", () => {
      beforeEach(() => {
        delete (global as any).WeakRef;
        jest.resetModules();
        M = require("./inject").Module;
      });

      afterEach(() => ((global as any).WeakRef = WeakRef));

      it("should fall back to singletons", () => {
        const factory = jest.fn();
        const inject = new M().volatile("a", factory).createInjector();
        // mockVolatileMap.has.mockReturnValue(false);

        inject("a");
        inject("a");

        expect(mockVolatileMap.set).toHaveBeenCalledTimes(0);
        expect(factory).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("singletons", () => {
    it("should define singletons", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = new Module().singleton("a", factory).createInjector();

      expect(inject("a")).toBe(inject("a"));
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("prototypes", () => {
    it("should define prototypes", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = new Module().prototype("a", factory).createInjector();

      expect(inject("a")).not.toBe(inject("a"));
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("add()", () => {
    it("should merge passed modules into the new module", () => {
      const m1 = new Module().value("a", 1).prototype("b", () => "b");
      const m2 = new Module().singleton("a", () => 2).volatile("c", () => "c");

      const inject = new Module().add(m1, m2).value("d", "d").createInjector();

      expect(inject("a")).toBe(2);
      expect(inject("b")).toBe("b");
      expect(inject("c")).toBe("c");
      expect(inject("d")).toBe("d");
    });
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

    const moduleA = new Module().volatile(
      "serviceA",
      () => new ServiceA() as IServiceA
    );

    const moduleB = new Module()
      .add(moduleA)
      .volatile("serviceB", (i) => new ServiceB(i("serviceA")) as IServiceB);

    // Run

    const inject = moduleB.createInjector();

    inject("serviceB").useServiceA();

    expect(console.log).toHaveBeenCalledWith("bar");
  });
});

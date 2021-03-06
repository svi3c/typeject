import { Module } from "./inject";

const console = { log: jest.fn() };

const mockWeakRef = { deref: jest.fn() };
let MockWeakRef = jest.fn(() => mockWeakRef);

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).WeakRef = MockWeakRef;
});

describe("Module", () => {
  describe("injector", () => {
    it("should provide bound instances", () => {
      const value = {};
      const inject = new Module().value("foo", value).injector;

      expect(inject.foo()).toEqual({});
    });

    it("should pass the injector to the factories to retrieve dependencies", () => {
      const inject = new Module()
        .singleton("foo", () => ({ foo: "bar" }))
        .singleton("bar", (i) => ({ bar: i.foo().foo.replace("r", "z") }))
        .injector;

      expect(inject.bar().bar).toEqual("baz");
    });
  });

  describe("volatiles", () => {
    const WeakRef = (global as any).WeakRef;

    describe("with WeakRef", () => {
      it("should define volatiles", () => {
        const obj = {};
        const factory = jest.fn().mockImplementation(() => obj);
        const inject = new Module().volatile("a", factory).injector;
        mockWeakRef.deref.mockReturnValueOnce(obj);

        const instance1 = inject.a();
        const instance2 = inject.a();

        expect(instance1).toBe(obj);
        expect(instance1).toBe(instance2);
        expect(MockWeakRef).toHaveBeenCalledWith({});
        expect(MockWeakRef).toHaveBeenCalledTimes(1);
        expect(factory).toHaveBeenCalledTimes(1);
      });

      it("should recreate volatile instances if garbage-collected", () => {
        const factory = jest.fn();
        const inject = new Module().volatile("a", factory).injector;

        inject.a();
        inject.a();

        expect(MockWeakRef).toHaveBeenCalledTimes(2);
        expect(factory).toHaveBeenCalledTimes(2);
      });
    });

    describe("no WeakRef", () => {
      beforeEach(() => {
        delete (global as any).WeakRef;
      });

      it("should fall back to singletons", () => {
        const factory = jest.fn(() => ({}));
        const inject = new Module().volatile("a", factory).injector;

        inject.a();
        inject.a();

        expect(MockWeakRef).not.toHaveBeenCalled();
        expect(factory).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("singletons", () => {
    it("should define singletons", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = new Module().singleton("a", factory).injector;

      expect(inject.a()).toBe(inject.a());
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });

  describe("prototypes", () => {
    it("should define prototypes", () => {
      const factory = jest.fn().mockImplementation(() => ({}));
      const inject = new Module().prototype("a", factory).injector;

      expect(inject.a()).not.toBe(inject.a());
      expect(factory).toHaveBeenCalledTimes(2);
    });
  });

  describe("add()", () => {
    it("should merge passed modules into the new module", () => {
      const m1 = new Module().value("a", 1).prototype("b", () => "b");
      const m2 = new Module().singleton("a", () => 2).volatile("c", () => "c");

      const inject = new Module().add(m1, m2).value("d", "d").injector;

      expect(inject.a()).toBe(2);
      expect(inject.b()).toBe("b");
      expect(inject.c()).toBe("c");
      expect(inject.d()).toBe("d");
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
      .volatile("serviceB", (i) => new ServiceB(i.serviceA()) as IServiceB);

    // Run

    const inject = moduleB.injector;

    inject.serviceB().useServiceA();

    expect(console.log).toHaveBeenCalledWith("bar");
  });
});

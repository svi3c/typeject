import { prototype, singleton, volatile } from "./inject";

const console = { log: jest.fn() };

const mockWeakRef = { deref: jest.fn() };
let MockWeakRef = jest.fn(() => mockWeakRef);

beforeEach(() => {
  jest.clearAllMocks();
  (global as any).WeakRef = MockWeakRef;
});

describe("volatile()", () => {
  describe("with WeakRef", () => {
    it("should define volatiles", () => {
      const obj = {};
      const factory = jest.fn(() => obj);
      const v = volatile(factory);
      mockWeakRef.deref.mockReturnValueOnce(obj).mockReturnValueOnce(obj);

      expect(v()).toBe(obj);
      expect(v()).toBe(v());
      expect(MockWeakRef).toHaveBeenCalledWith({});
      expect(MockWeakRef).toHaveBeenCalledTimes(1);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it("should recreate volatile instances if garbage-collected", () => {
      const factory = jest.fn();
      const v = volatile(factory);
      mockWeakRef.deref.mockReturnValueOnce(undefined);

      v();
      v();

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
      const v = volatile(factory);

      v();
      v();

      expect(MockWeakRef).not.toHaveBeenCalled();
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
});

describe("singleton()", () => {
  it("should define singletons", () => {
    const factory = jest.fn(() => ({}));
    const s = singleton(factory);

    expect(s()).toBe(s());
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe("prototype()", () => {
  it("should define singletons", () => {
    const factory = jest.fn(() => ({}));
    const p = prototype(factory);

    expect(p()).not.toBe(p());
    expect(factory).toHaveBeenCalledTimes(2);
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

    const serviceA = volatile<IServiceA>(() => new ServiceA());

    const serviceB = volatile<IServiceB>(() => new ServiceB(serviceA()));

    // Run

    serviceB().useServiceA();

    expect(console.log).toHaveBeenCalledWith("bar");
  });
});

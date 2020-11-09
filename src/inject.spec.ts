import { Context, createInjector, toContext } from "./inject";
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

    const ctx: Context<{ a: {} }> = toContext(definition);

    expect(definition).toBe(ctx);
  });
});

describe("Examples", () => {
  describe("1", () => {
    interface ServiceA {
      useServiceB(): any;
    }
    interface ServiceB {
      use(): any;
    }

    interface MyContext {
      serviceA: ServiceA;
      serviceB: ServiceB;
    }

    const injector = createInjector<MyContext>({
      serviceA: (i) => ({ useServiceB: () => i("serviceB").use() }),
      serviceB: () => ({ use: () => console.log("used") }),
    });

    injector("serviceA").useServiceB();

    expect(console.log).toHaveBeenCalledWith("used");
  });
});

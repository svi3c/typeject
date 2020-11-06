import { createInjector } from "./inject";

describe("createInjector()", () => {
  it("should provide bound instances", () => {
    const inject = createInjector({ foo: () => "bar" });

    expect(inject("foo")).toEqual("bar");
  });

  it("should pass the injector to the factories to retrieve dependencies", () => {
    const inject = createInjector({
      foo: () => "bar",
      bar: (i) => i("foo").replace("r", "z"),
    });

    expect(inject("bar")).toEqual("baz");
  });

  it("should create singletons by default", () => {
    const factory = jest.fn().mockImplementation(() => ({}));
    const inject = createInjector({
      a: factory,
    });

    expect(inject("a")).toBe(inject("a"));
    expect(factory).toHaveBeenCalledTimes(1);
  });
});

describe("proto()", () => {
  it("should define prototypes", () => {
    const factory = jest.fn().mockImplementation(() => ({}));
    const inject = createInjector({
      a: ["prototype", factory],
    });

    expect(inject("a")).not.toBe(inject("a"));
    expect(factory).toHaveBeenCalledTimes(2);
  });
});

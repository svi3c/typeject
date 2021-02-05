import { VolatileMap } from "./volatile-map";

const mockRef = { deref: jest.fn() };
(global as any).WeakRef = jest.fn().mockImplementation(() => mockRef);

describe("VolatileMap", () => {
  beforeEach(() => {
    mockRef.deref.mockReset();
  });
  describe("set()", () => {
    it("should set a value and return itself for chaining", () => {
      const map = new VolatileMap<number, {}>();

      const ret = map.set(123, {});

      expect(ret).toBe(map);
      expect(WeakRef).toHaveBeenCalledWith({});
    });
  });

  describe("get()", () => {
    it("should get the WeakRef value", () => {
      const obj = {};
      const map = new VolatileMap<number, {}>();
      map.set(123, obj);
      mockRef.deref.mockReturnValue(obj);

      expect(map.get(123)).toBe(obj);
    });

    it("should return null, if there is no entry", () => {
      const map = new VolatileMap<number, {}>();

      expect(map.get(123)).toBeNull();
    });

    it("should return null, if the entry is not hold by the WeakRef", () => {
      const obj = {};
      const map = new VolatileMap<number, {}>();
      map.set(123, obj);

      expect(map.get(123)).toBeNull();
    });
  });
});

import { describe, it, expect } from "vitest";
import { LRUCache } from "../../core/lruCache";

describe("LRUCache", () => {
  it("should return undefined for non-existing keys", () => {
    const cache = new LRUCache<string, number>(2);
    expect(cache.get("a")).toBeUndefined();
  });

  it("should store and retrieve values", () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("a", 1);
    cache.put("b", 2);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
  });

  it("should evict least recently used item when capacity is exceeded", () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.put("c", 3); // Evicts 'a'
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
  });

  it("should update recently used item", () => {
    const cache = new LRUCache<string, number>(2);
    cache.put("a", 1);
    cache.put("b", 2);
    cache.get("a");
    cache.put("c", 3); // Evicts 'b'
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
  });
});

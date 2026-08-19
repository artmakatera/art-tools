import { LRUCache } from "./lruCache";

export function memoizeWithLRUCache<K, V>(fn: (arg: K) => V, cacheSize: number): (arg: K) => V {
  const cache = new LRUCache<K, V>(cacheSize);
  return (arg: K) => {
    const cached = cache.get(arg);
    if (cached != null) {
      return cached;
    }
    const result = fn(arg);
    cache.put(arg, result);
    return result;
  };
}

export function memoize<K, V>(fn: (arg: K) => V, cacheSize: number): (arg: K) => V {
  return memoizeWithLRUCache(fn, cacheSize);
}

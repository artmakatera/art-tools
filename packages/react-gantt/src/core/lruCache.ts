
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private capacity: number;



  constructor(size: number) {
    this.capacity = size;
  }

  private refreshKey(key: K): void {
    if (!this.cache.has(key)) return;
    const val = this.cache.get(key) as V;
    this.cache.delete(key);
    this.cache.set(key, val);

  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    this.refreshKey(key);
    return this.cache.get(key)
  }

  put(key: K, value: V): void {
    this.refreshKey(key);
    this.cache.set(key, value);

    if (this.cache.size > this.capacity) {
      const [removeKey] = this.cache.keys()
      this.cache.delete(removeKey as K);
    }
  }

}
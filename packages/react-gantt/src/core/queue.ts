/**
 * FIFO queue backed by a single array with a moving read cursor.
 *
 * Plain `Array.shift()` is O(n) — it re-indexes every remaining element on each
 * dequeue, so draining n items costs O(n²). Here `dequeue` just advances a head
 * pointer (O(1)); the consumed prefix is compacted lazily once it dominates the
 * array, keeping memory bounded without paying the re-index cost per item.
 */
export class Queue<T> {
  private items: T[] = [];
  private head = 0;

  constructor(initial?: Iterable<T>) {
    if (initial) {
      this.items.push(...initial);
    }
  }

  get size(): number {
    return this.items.length - this.head;
  }

  isEmpty(): boolean {
    return this.size === 0;
  }

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head >= this.items.length) {
      return undefined;
    }
    const item = this.items[this.head];
    this.head++;

    // Reclaim the consumed prefix once it grows past half the array.
    // this.head > this.items.length / 2 is equivalent but may involve a slower division, so we use a bit shift.
    if (this.head > this.items.length >> 1) {
      this.items = this.items.slice(this.head);
      this.head = 0;
    }

    return item;
  }
}

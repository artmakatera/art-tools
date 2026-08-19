import { describe, expect, it } from "vitest";
import { Queue } from "../../core/queue";

/**
 * `Queue` backs the dependency-cascade BFS in `scheduleDependents`, including a
 * non-null assertion on `dequeue()`. It had no test, and its lazy prefix
 * compaction is the kind of index bookkeeping that breaks silently.
 */

describe("Queue", () => {
  it("starts empty", () => {
    const q = new Queue<number>();
    expect(q.isEmpty()).toBe(true);
    expect(q.size).toBe(0);
    expect(q.dequeue()).toBeUndefined();
  });

  it("seeds from an iterable", () => {
    const q = new Queue([1, 2, 3]);
    expect(q.size).toBe(3);
    expect(q.isEmpty()).toBe(false);
  });

  it("preserves FIFO order", () => {
    const q = new Queue([1, 2, 3]);
    q.enqueue(4);
    expect([q.dequeue(), q.dequeue(), q.dequeue(), q.dequeue()]).toEqual([1, 2, 3, 4]);
    expect(q.dequeue()).toBeUndefined();
  });

  it("keeps size honest across the lazy compaction", () => {
    // Compaction triggers once the consumed prefix passes half the array, so
    // walk a queue long enough to cross that boundary several times.
    const q = new Queue<number>(Array.from({ length: 10 }, (_, i) => i));
    const seen: number[] = [];
    let expectedSize = 10;
    while (!q.isEmpty()) {
      expect(q.size).toBe(expectedSize);
      seen.push(q.dequeue()!);
      expectedSize--;
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(q.size).toBe(0);
  });

  it("interleaves enqueue and dequeue without losing items", () => {
    // The BFS shape: each dequeue may push more work, so the read cursor and the
    // tail advance together.
    const q = new Queue<number>([0]);
    const seen: number[] = [];
    let next = 1;
    while (!q.isEmpty() && seen.length < 12) {
      const item = q.dequeue()!;
      seen.push(item);
      if (next < 12) {
        q.enqueue(next++);
        q.enqueue(next++);
      }
    }
    expect(seen).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("can be refilled after being drained", () => {
    const q = new Queue<string>(["a"]);
    expect(q.dequeue()).toBe("a");
    expect(q.isEmpty()).toBe(true);
    q.enqueue("b");
    expect(q.size).toBe(1);
    expect(q.dequeue()).toBe("b");
  });
});

import { describe, expect, it } from 'vitest';
import taskStyles from '../src/components/bars/taskBar/TaskBar.module.css';
import progressStyles from '../src/components/bars/progress/BarProgress.module.css';

describe('CSS Modules pipeline', () => {
  it('returns a class-name map for TaskBar.module.css', () => {
    expect(taskStyles).toMatchObject({
      task: expect.any(String),
      taskInner: expect.any(String),
      taskContent: expect.any(String),
      resizer: expect.any(String),
      startResizer: expect.any(String),
      endResizer: expect.any(String),
    });
  });

  it('returns a class-name map for BarProgress.module.css', () => {
    expect(progressStyles).toMatchObject({
      barProgress: expect.any(String),
      barProgressResizeHandle: expect.any(String),
    });
  });

  it('uses the non-scoped strategy so class names match the source', () => {
    expect(taskStyles.task).toBe('task');
    expect(progressStyles.barProgress).toBe('barProgress');
  });
});

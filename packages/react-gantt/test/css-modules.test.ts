import { describe, expect, it } from 'vitest';
import taskStyles from '../src/components/taskBar/TaskBar.module.css';
import progressStyles from '../src/components/taskBar/progress/TaskProgress.module.css';

describe('CSS Modules pipeline', () => {
  it('returns a class-name map for Task.module.css', () => {
    expect(taskStyles).toMatchObject({
      task: expect.any(String),
      taskInner: expect.any(String),
      taskContent: expect.any(String),
      resizer: expect.any(String),
      startResizer: expect.any(String),
      endResizer: expect.any(String),
    });
  });

  it('returns a class-name map for TaskProgress.module.css', () => {
    expect(progressStyles).toMatchObject({
      taskProgress: expect.any(String),
      taskProgressResizeHandle: expect.any(String),
    });
  });

  it('uses the non-scoped strategy so class names match the source', () => {
    expect(taskStyles.task).toBe('task');
    expect(progressStyles.taskProgress).toBe('taskProgress');
  });
});

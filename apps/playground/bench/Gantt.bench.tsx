import { Gantt } from '@am/react-gantt';
import { renderToString } from 'react-dom/server';
import { bench, describe } from 'vitest';
import { generateTasks } from '../src/fixtures';

const small = generateTasks(10);
const medium = generateTasks(100);
const large = generateTasks(1_000);
const xlarge = generateTasks(10_000);

describe('Gantt server render', () => {
  bench('10 tasks', () => {
    renderToString(<Gantt tasks={small} />);
  });

  bench('100 tasks', () => {
    renderToString(<Gantt tasks={medium} />);
  });

  bench('1k tasks', () => {
    renderToString(<Gantt tasks={large} />);
  });

  bench('10k tasks', () => {
    renderToString(<Gantt tasks={xlarge} />);
  });
});

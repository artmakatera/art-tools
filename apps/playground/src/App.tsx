import { Gantt, type Task } from '@am/react-gantt';
import { Profiler, useMemo, useRef, useState, type ProfilerOnRenderCallback } from 'react';
import { generateTasks } from './fixtures';

const SIZES = [10, 100, 1_000, 5_000, 10_000] as const;
type Size = (typeof SIZES)[number];

interface ProfileSample {
  phase: Parameters<ProfilerOnRenderCallback>[1];
  actualDuration: number;
  baseDuration: number;
}

export function App() {
  const [size, setSize] = useState<Size>(100);
  const [profile, setProfile] = useState<ProfileSample | null>(null);
  const seenForSizeRef = useRef<Size | null>(null);

  const tasks = useMemo<readonly Task[]>(() => generateTasks(size), [size]);

  const onRender: ProfilerOnRenderCallback = (_id, phase, actualDuration, baseDuration) => {
    if (seenForSizeRef.current === size) return;
    seenForSizeRef.current = size;
    setProfile({ phase, actualDuration, baseDuration });
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <header style={{ marginBottom: 16 }}>
        <h1 style={{ margin: '0 0 8px' }}>react-gantt playground</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <label>
            tasks:&nbsp;
            <select
              value={size}
              onChange={(e) => {
                seenForSizeRef.current = null;
                setSize(Number(e.target.value) as Size);
              }}
            >
              {SIZES.map((n) => (
                <option key={n} value={n}>
                  {n.toLocaleString()}
                </option>
              ))}
            </select>
          </label>
          {profile && (
            <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13 }}>
              {profile.phase} · actual {profile.actualDuration.toFixed(2)} ms · base{' '}
              {profile.baseDuration.toFixed(2)} ms
            </span>
          )}
        </div>
      </header>
      <Profiler id="gantt" onRender={onRender}>
        <Gantt tasks={tasks} />
      </Profiler>
    </main>
  );
}

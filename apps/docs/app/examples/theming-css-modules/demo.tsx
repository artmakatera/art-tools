"use client";

import { Gantt } from "@am/react-gantt";
import { treeTasks } from "@/lib/demo-tasks";
import styles from "./demo.module.css";

/**
 * The same tokens as the CSS-variables example, but scoped by a generated class
 * instead of applied globally — so two differently-themed charts can sit on one
 * page. See demo.module.css below for the tokens and the `:global` caveat.
 */
export function CssModulesDemo() {
  return (
    <div className={styles.teal}>
      <Gantt tasks={treeTasks} height={360} />
    </div>
  );
}

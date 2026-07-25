import type { CalendarUnit } from "../types";
import { memoize } from "./utils";

const MS_PER_DAY = 86_400_000;

export function periodKey(date: Date, unit: CalendarUnit, step: number): string {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();

  switch (unit) {
    case "day": {
      const dayIndex = Math.floor(Date.UTC(y, m, d) / MS_PER_DAY);
      return `d-${Math.floor(dayIndex / step)}`;
    }
    case "week": {
      const local = new Date(y, m, d);
      const dow = local.getDay();
      const toMonday = dow === 0 ? -6 : 1 - dow;
      local.setDate(local.getDate() + toMonday);
      const weekIndex = Math.floor(local.getTime() / (MS_PER_DAY * 7));
      return `w-${Math.floor(weekIndex / step)}`;
    }
    case "month": {
      const monthIndex = y * 12 + m;
      return `mo-${Math.floor(monthIndex / step)}`;
    }
    case "quarter": {
      const quarterIndex = y * 4 + Math.floor(m / 3);
      return `q-${Math.floor(quarterIndex / step)}`;
    }
    case "year": {
      return `y-${Math.floor(y / step)}`;
    }
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

export function isWeekend(date: Date): boolean {
  const dow = date.getDay();
  return dow === 0 || dow === 6;
}

export function diffDays(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / MS_PER_DAY);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + days * MS_PER_DAY);
}

export function buildDates(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

interface TaskDates {
  startDate: Date;
  endDate?: Date;
}

function getMinMaxDatesNonCached(tasks: readonly TaskDates[]): { min: Date; max: Date } | null {
   const first = tasks[0];
  if (!first) return null;
    let min = first.startDate;
  let max = first.endDate ?? first.startDate;
  for (const t of tasks) {
    if (t.startDate < min) min = t.startDate;
    const end = t.endDate ?? t.startDate;
    if (end > max) max = end;
  }
  return { min, max };
}

export const getMinMaxDates = memoize(getMinMaxDatesNonCached, 3);




export function buildDatesFromTasks(
  tasks: readonly TaskDates[],
  padDays = 0,
): Date[] {
  const range = getMinMaxDates(tasks);
  if (!range) return [];
  
  const { min, max } = range;
  let start = addDays(min, -padDays);
  let end = addDays(max, padDays);
  return buildDates(start, diffDays(start, end) + 1);
}


export function getEndDate(startDate: Date, endDate?: Date, duration?: number, ): Date {
  if (endDate) return endDate;
  if (duration === undefined) return startDate;
  return addDays(startDate, duration - 1);
}
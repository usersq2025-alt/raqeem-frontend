"use client";

import { useCallback, useEffect, useState } from "react";
import {
  mapJourneyDashboard,
  type DailyGoalTarget,
  type JourneyDashboard,
} from "@/lib/api/journeyDashboard";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: JourneyDashboard };

export function useStudentJourneyDashboard(childId: number, initialData?: JourneyDashboard | null) {
  const [state, setState] = useState<State>(() =>
    initialData ? { status: "ready", data: initialData } : { status: "error", message: "LOAD_FAILED" }
  );
  const [savingGoal, setSavingGoal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/students/${childId}/journey-dashboard`, {
        credentials: "include",
        cache: "no-store",
      });
      const raw = await res.json().catch(() => null);
      if (!res.ok) {
        setState({ status: "error", message: "LOAD_FAILED" });
        return;
      }
      const mapped = mapJourneyDashboard(raw);
      if (!mapped) {
        setState({ status: "error", message: "LOAD_FAILED" });
        return;
      }
      setState({ status: "ready", data: mapped });
    } catch {
      setState({ status: "error", message: "LOAD_FAILED" });
    }
  }, [childId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(id);
  }, [toast]);

  const updateDailyGoal = useCallback(
    async (target: DailyGoalTarget) => {
      setSavingGoal(true);
      try {
        const res = await fetch(`/api/students/${childId}/daily-goal`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target_lessons: target }),
        });
        const raw = await res.json().catch(() => null);
        if (!res.ok) {
          setToast("goalSaveFailed");
          return false;
        }
        const mapped = mapJourneyDashboard(raw);
        if (!mapped) {
          setToast("goalSaveFailed");
          return false;
        }
        setState({ status: "ready", data: mapped });
        setToast("goalSaved");
        return true;
      } catch {
        setToast("goalSaveFailed");
        return false;
      } finally {
        setSavingGoal(false);
      }
    },
    [childId]
  );

  return { state, savingGoal, toast, clearToast: () => setToast(null), reload: load, updateDailyGoal };
}

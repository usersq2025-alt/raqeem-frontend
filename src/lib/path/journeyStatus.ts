import type { PathStation, PathStationStatus } from "@/lib/api/units";

export type JourneyNodeStatus = "completed" | "current" | "available" | "locked";

export function resolveJourneyStatuses(stations: PathStation[]): JourneyNodeStatus[] {
  let currentAssigned = false;
  return stations.map((station) => {
    if (station.status === "completed") return "completed";
    if (station.status === "locked") return "locked";
    // available
    if (!currentAssigned) {
      currentAssigned = true;
      return "current";
    }
    return "available";
  });
}

export function findFocusStationIndex(
  stations: PathStation[],
  statuses: JourneyNodeStatus[],
  focusLessonId?: number | null
): number {
  if (focusLessonId) {
    const focused = stations.findIndex((s) => s.lessonId === focusLessonId && s.status !== "locked");
    if (focused >= 0) return focused;
  }
  const current = statuses.findIndex((s) => s === "current");
  if (current >= 0) return current;
  const allDone = stations.length > 0 && stations.every((s) => s.status === "completed");
  if (allDone) return stations.length; // review station sentinel
  if (stations.length === 0) return 0;
  // first locked or last completed
  for (let i = stations.length - 1; i >= 0; i--) {
    if (stations[i]?.status === "completed") return i;
  }
  return 0;
}

export function reviewStationStatus(stations: PathStation[]): PathStationStatus {
  if (stations.length === 0) return "locked";
  if (stations.every((s) => s.status === "completed")) return "available";
  return "locked";
}

export function countCompleted(stations: PathStation[]): number {
  return stations.filter((s) => s.status === "completed").length;
}

"use client";

/**
 * Temporarily disabled (offline feature paused): re-exports the real API functions
 * unchanged, so ReviewStationExperience.tsx needs no structural changes when this is
 * turned back on later. No local bundle, no local grading, no offline fallback -
 * every call always goes straight to the server, exactly like before the offline
 * feature existed.
 */
export {
  getReviewQuestion,
  getUnitReview,
  submitReviewAnswer,
} from "@/lib/api/review";

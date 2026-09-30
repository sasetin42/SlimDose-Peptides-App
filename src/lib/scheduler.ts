/**
 * SlimDose Admin Client-Side Scheduler
 * Processes due follow-ups and scheduled campaigns while an admin session is
 * active. The Firebase scheduled function (functions/scheduledEmails.js) is the
 * 24/7 companion — both share the same idempotent engine in lib/marketing.ts.
 */

import { processDueFollowUps, processScheduledCampaigns, backfillFollowUps } from './marketing';

const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let timer: ReturnType<typeof setInterval> | null = null;
let running = false;
let lastRun: number | null = null;

export interface SchedulerRunResult {
  followUps: { processed: number; sent: number; failed: number };
  campaigns: { started: number };
  backfilled: number;
  at: string;
}

const runOnce = async (): Promise<SchedulerRunResult | null> => {
  if (running) return null;
  running = true;
  try {
    const backfilled = await backfillFollowUps();
    const followUps = await processDueFollowUps();
    const campaigns = await processScheduledCampaigns();
    lastRun = Date.now();
    const result: SchedulerRunResult = {
      followUps,
      campaigns,
      backfilled,
      at: new Date().toISOString(),
    };
    if (followUps.processed > 0 || backfilled > 0) {
      console.info('[scheduler] run complete:', result);
    }
    return result;
  } catch (e) {
    console.warn('[scheduler] run failed:', e);
    return null;
  } finally {
    running = false;
  }
};

/** Start the in-app scheduler (idempotent) */
export const startScheduler = () => {
  if (timer) return;
  // Initial run shortly after load
  setTimeout(() => { runOnce(); }, 10_000);
  timer = setInterval(() => { runOnce(); }, TICK_INTERVAL_MS);
};

export const stopScheduler = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};

export const runSchedulerNow = runOnce;
export const getLastSchedulerRun = () => lastRun;

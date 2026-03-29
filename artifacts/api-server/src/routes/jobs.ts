import { Router } from "express";
import { fetchAllJobs } from "../services/jobkaka.js";
import type { JobItem } from "@workspace/api-spec/zod";

const router = Router();

const PAGE_SIZE = 20;
const CACHE_TTL_MS = 30 * 60 * 1000;

let cachedJobs: JobItem[] = [];
let cacheExpiresAt = 0;
let fetchInProgress: Promise<JobItem[]> | null = null;

async function getJobs(): Promise<JobItem[]> {
  if (Date.now() < cacheExpiresAt && cachedJobs.length > 0) {
    return cachedJobs;
  }
  if (fetchInProgress) return fetchInProgress;

  fetchInProgress = fetchAllJobs()
    .then((jobs) => {
      cachedJobs = jobs;
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      fetchInProgress = null;
      return jobs;
    })
    .catch(() => {
      fetchInProgress = null;
      return cachedJobs;
    });

  return fetchInProgress;
}

router.get("/jobs", async (req, res) => {
  try {
    let jobs = await getJobs();

    const { state, category, search, page } = req.query as Record<string, string>;

    if (state && state !== "All India") {
      jobs = jobs.filter(
        (j) =>
          j.state === state ||
          j.state === "All India" ||
          j.district?.toLowerCase().includes(state.toLowerCase())
      );
    }

    if (category && category !== "All India Govt Jobs") {
      jobs = jobs.filter((j) => j.category === category);
    }

    if (search) {
      const q = search.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.organization.toLowerCase().includes(q) ||
          j.category.toLowerCase().includes(q)
      );
    }

    const total = jobs.length;
    const pageNum = Math.max(1, parseInt(page || "1", 10));
    const totalPages = Math.ceil(total / PAGE_SIZE) || 1;
    const paged = jobs.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

    res.json({
      jobs: paged,
      total,
      page: pageNum,
      totalPages,
      lastFetched: new Date(cacheExpiresAt - CACHE_TTL_MS).toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

router.get("/jobs/:id", async (req, res) => {
  try {
    const jobs = await getJobs();
    const job = jobs.find((j) => j.id === req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
    res.json(job);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;

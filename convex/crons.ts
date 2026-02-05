import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync all repos",
  { hours: 1 },
  internal.github.syncAllRepositories
);

export default crons;

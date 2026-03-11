import { execa } from "execa";
import { HermesError } from "./errors.js";

export interface RepoDiff {
  name: string;
  branch: string;
  skipped: boolean;
  commits: string;
  stat: string;
  diff: string;
}

export interface CollectDiffsResult {
  repos: RepoDiff[];
  aggregateText: string;
}

const REPOS = [
  {
    name: "cw-react",
    path: "/Users/vitorsousa/Documents/dev/care-webs/cw-react",
    excludes: [":(exclude)src/graphql/", ":(exclude)package-lock.json"],
  },
  {
    name: "cw-core",
    path: "/Users/vitorsousa/Documents/dev/care-webs/cw-core",
    excludes: [
      ":(exclude)src/graphql/cw-core/enums/",
      ":(exclude)src/graphql/cw-core/inputs/",
      ":(exclude)src/graphql/cw-core/objects/",
      ":(exclude)package-lock.json",
    ],
  },
  {
    name: "cw-ms-timesheets",
    path: "/Users/vitorsousa/Documents/dev/care-webs/cw-ms-timesheets",
    excludes: [":(exclude)package-lock.json"],
  },
  {
    name: "cw-system-structure",
    path: "/Users/vitorsousa/Documents/dev/care-webs/system-structure/cw-system-structure",
    excludes: [":(exclude)package-lock.json"],
  },
];

const PROTECTED = new Set(["main", "master", "staging"]);

const GIT_ENV = { GIT_TERMINAL_PROMPT: "0", GIT_EDITOR: "true" };

async function getBranch(repoPath: string): Promise<string> {
  const { stdout } = await execa("git", ["-C", repoPath, "rev-parse", "--abbrev-ref", "HEAD"], {
    env: { ...process.env, ...GIT_ENV },
    reject: false,
  });
  return stdout.trim();
}

export function buildSummaryCachePath(branch: string): string {
  const sanitized = branch.replace(/\//g, "-");
  return `/tmp/hermes-summary-${sanitized}.txt`;
}

export async function collectDiffs(
  onProgress?: (msg: string) => void
): Promise<CollectDiffsResult> {
  const log = (msg: string) => onProgress?.(msg);

  // Phase 1: Branch check (parallel)
  log("[1/3] Checking branch statuses...");
  const branchResults = await Promise.all(
    REPOS.map(async (repo) => {
      const branch = await getBranch(repo.path);
      const skipped = PROTECTED.has(branch) || branch === "";
      return { ...repo, branch, skipped };
    })
  );

  for (const r of branchResults) {
    log(`  ${r.skipped ? "SKIPPED" : "ACTIVE "}  ${r.name} (branch: ${r.branch || "unknown"})`);
  }

  const active = branchResults.filter((r) => !r.skipped);

  // Phase 2: Fetch + merge origin/main (sequential)
  log("[2/3] Updating repos with origin/main...");
  for (const repo of active) {
    log(`  [${repo.name}] Fetching origin...`);
    await execa("git", ["-C", repo.path, "fetch", "origin", "-q"], {
      env: { ...process.env, ...GIT_ENV },
    });

    log(`  [${repo.name}] Merging origin/main...`);
    const mergeResult = await execa(
      "git",
      ["-C", repo.path, "merge", "origin/main", "--no-edit"],
      { env: { ...process.env, ...GIT_ENV }, reject: false }
    );

    if (mergeResult.exitCode !== 0) {
      const conflictsResult = await execa(
        "git",
        ["-C", repo.path, "diff", "--name-only", "--diff-filter=U"],
        { env: { ...process.env, ...GIT_ENV }, reject: false }
      );
      await execa("git", ["-C", repo.path, "merge", "--abort"], {
        env: { ...process.env, ...GIT_ENV },
        reject: false,
      });
      const files = conflictsResult.stdout.trim();
      throw new HermesError(
        `Merge conflict in ${repo.name}.`,
        `Conflicting files:\n${files}`
      );
    }
  }

  // Phase 3: Collect diffs (parallel)
  log("[3/3] Collecting diffs...");
  const diffs = await Promise.all(
    active.map(async (repo) => {
      const mbResult = await execa(
        "git",
        ["-C", repo.path, "merge-base", "origin/main", "HEAD"],
        { env: { ...process.env, ...GIT_ENV } }
      );
      const mergeBase = mbResult.stdout.trim();

      const logResult = await execa(
        "git",
        ["-C", repo.path, "--no-pager", "log", "--oneline", `${mergeBase}..HEAD`],
        { env: { ...process.env, ...GIT_ENV }, reject: false }
      );
      const commits = logResult.stdout.trim();

      if (!commits) {
        log(`  [${repo.name}] No commits since main — skipping`);
        return { name: repo.name, branch: repo.branch, skipped: false, commits: "", stat: "", diff: "" };
      }

      const commitCount = commits.split("\n").length;
      log(`  [${repo.name}] ${commitCount} commit(s) found — collecting...`);

      const statResult = await execa(
        "git",
        ["-C", repo.path, "--no-pager", "diff", "--stat", `${mergeBase}..HEAD`, "--", ".", ...repo.excludes],
        { env: { ...process.env, ...GIT_ENV }, reject: false }
      );

      const diffResult = await execa(
        "git",
        ["-C", repo.path, "--no-pager", "diff", "--no-color", `${mergeBase}..HEAD`, "--", ".", ...repo.excludes],
        { env: { ...process.env, ...GIT_ENV }, reject: false }
      );

      log(`  [${repo.name}] Done.`);

      return {
        name: repo.name,
        branch: repo.branch,
        skipped: false,
        commits,
        stat: statResult.stdout.trim(),
        diff: diffResult.stdout.trim(),
      };
    })
  );

  const parts: string[] = [];
  for (const r of branchResults) {
    if (r.skipped) {
      parts.push(`REPO=${r.name} | BRANCH=${r.branch} | STATUS=SKIPPED\n`);
    } else {
      const d = diffs.find((x) => x.name === r.name);
      if (!d || !d.commits) {
        parts.push(`=== ${r.name}: NO CHANGES ===\n`);
      } else {
        parts.push(`=== ${r.name} COMMITS ===\n${d.commits}\n`);
        parts.push(`=== ${r.name} DIFF STAT ===\n${d.stat}\n`);
        parts.push(`=== ${r.name} DIFF ===\n${d.diff}\n`);
      }
    }
  }

  const aggregateText = parts.join("\n");

  const repos: RepoDiff[] = branchResults.map((r) => {
    const d = diffs.find((x) => x.name === r.name);
    return {
      name: r.name,
      branch: r.branch,
      skipped: r.skipped,
      commits: d?.commits ?? "",
      stat: d?.stat ?? "",
      diff: d?.diff ?? "",
    };
  });

  return { repos, aggregateText };
}

import chalk from "chalk";
import { unlink, readdir } from "fs/promises";
import { join } from "path";
import { getCurrentBranch } from "../lib/git.js";
import { buildSummaryCachePath } from "../lib/diff.js";

export interface ClearCacheOptions {
  /** Branch to clear cache for (default: current branch) */
  branch?: string;
  /** Clear all hermes summary caches */
  all?: boolean;
}

export async function clearCacheCommand(options: ClearCacheOptions = {}): Promise<void> {
  if (options.all) {
    const tmpDir = "/tmp";
    const files = await readdir(tmpDir);
    const toDelete = files.filter(
      (f) => f.startsWith("hermes-summary-") && f.endsWith(".txt")
    );
    for (const f of toDelete) {
      await unlink(join(tmpDir, f));
    }
    console.log(
      chalk.green(
        `\n✓ Cleared ${toDelete.length} cache file(s) from ${tmpDir}\n`
      )
    );
    return;
  }

  const branch = options.branch ?? (await getCurrentBranch());
  const cachePath = buildSummaryCachePath(branch);

  try {
    await unlink(cachePath);
    console.log(chalk.green(`\n✓ Cache cleared for branch ${chalk.cyan(branch)}\n`));
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? (err as NodeJS.ErrnoException).code : undefined;
    if (code === "ENOENT") {
      console.log(chalk.gray(`\n  No cache found for branch ${branch}\n`));
    } else {
      throw err;
    }
  }
}

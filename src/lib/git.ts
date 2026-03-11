import { execa } from "execa";

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return stdout.trim();
}

export async function branchExists(branch: string): Promise<boolean> {
  const result = await execa("git", ["rev-parse", "--verify", branch], {
    reject: false,
  });
  return !result.failed;
}


import { HermesError } from "./errors.js";

const PREVIEW_BASE = "https://app-";
const PREVIEW_DOMAIN = ".preview.carewebs.com";
const STG_SUFFIX = "-stg";

/**
 * Sanitizes a branch name the same way the deploy-feature-env workflow does
 * (Extract branch name and set dynamic environment variables step).
 * - Strips refs/heads/
 * - With prefix (feat/xxx-123, feature/abc-456, etc.): extracts task "xxx-123"
 * - Without prefix: uses full branch name
 * - Replaces non [a-zA-Z0-9-] with -, trims, lowercases
 */
export function sanitizeBranchLikeWorkflow(branchName: string): string {
  const raw = branchName.replace(/^refs\/heads\//, "").trim();

  // (feature|feat|bugfix|fix|improvement|hotfix|chore)/(XXX)-(NNN)(-|$)
  const withPrefix =
    /^(feature|feat|bugfix|fix|improvement|hotfix|chore)\/([a-zA-Z]{3})-([0-9]{3,})(-|$)/;
  const withPrefixMatch = raw.match(withPrefix);
  if (withPrefixMatch) {
    const proj = withPrefixMatch[2];
    const code = withPrefixMatch[3];
    return sanitizeSegment(`${proj}-${code}`);
  }

  // (XXX)-(NNN)(-|$) at start
  const withoutPrefix = /^([a-zA-Z]{3})-([0-9]{3,})(-|$)/;
  if (withoutPrefix.test(raw)) {
    return sanitizeSegment(raw);
  }

  throw new HermesError(
    `Branch name does not match expected pattern: ${raw}`,
    "Use feat/XXX-NNN or XXX-NNN (e.g. feat/abc-123 or abc-123)."
  );
}

function sanitizeSegment(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/**
 * Returns the sanitized segment used for the preview URL.
 * If the sanitized branch ends with "-stg", it is removed so the URL
 * points to the same ephemeral app (deploy uses base branch name).
 */
export function getSanitizedForPreviewUrl(branchName: string): string {
  const sanitized = sanitizeBranchLikeWorkflow(branchName);
  if (sanitized.endsWith(STG_SUFFIX)) {
    return sanitized.slice(0, -STG_SUFFIX.length);
  }
  return sanitized;
}

/**
 * Builds the ephemeral preview URL for the given branch.
 * Matches workflow output: https://app-{SANITIZED}.preview.carewebs.com
 * Removes -stg from sanitized name when present.
 */
export function getPreviewUrl(branchName: string): string {
  const segment = getSanitizedForPreviewUrl(branchName);
  return `${PREVIEW_BASE}${segment}${PREVIEW_DOMAIN}`;
}

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a technical writer generating Linear task templates for a software development team.

Given git diffs and commits from one or more repositories, generate a complete task template following these STRICT rules:

- Output must be fully in English.
- Always generate the full template.
- Write using brief, assertive, objective bullet points.
- Never use subtopics, sublevels, indentation layers, or nested bullets.
- QA section must be simple and non-technical.
- Developer Notes must be technical and precise.
- Developer Tests must be technical and precise.
- QA Tests must be technical and precise.
- Must follow formatting compatible with Linear.
- Must avoid personal names or sensitive personal data.
- Never use variable names, function names, object names, file names, or any direct code nomenclature inside the template EXCEPT in the Developer Notes section.
- In the Developer Notes section: do NOT mention file names, project names, or repository names. Write only flat bullet points describing what was technically implemented. Group related changes naturally by concept, not by file or repo.
- If a technical difficulty or non-obvious constraint was encountered during implementation, add an optional "TECHNICAL DIFFICULTIES" subsection at the end of the Dev Notes.
- Response must be deterministic, cohesive, and standardized.
- Keep everything concise and assertive.
- Ignore repositories that had no changes.

Output ONLY the template content below, nothing else:

TASK TITLE: [AI-generated title — concise, starts with ticket ID if provided, accurately describes what was delivered]

WHAT WAS IMPLEMENTED (DEV NOTES):
[Flat bullet points. Technical and precise. No file/repo names. Group by concept.]

WHERE TO ACCESS THE IMPROVEMENTS (QA):
[Simple navigation paths or UI areas for QA. Non-technical.]

HOW TO TEST IT (QA):
[Clear, non-technical, step-by-step instructions for QA.]

DEVELOPER TESTS
[ ] [Technical test item]
[ ] ...

QA TESTS
[ ] [Functional/user-facing test item]
[ ] ...

----------------------------------------
TASK SUMMARY
----------------------------------------
Task Title: [Same as above]

Summary of Change: [1-2 concise paragraph(s) suitable for a non-technical stakeholder. No file names, no code names.]`;

export interface GenerateTaskSummaryResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export async function generateTaskSummary(
  aggregateText: string,
  apiKey: string,
  context?: { ticketId?: string; ticketTitle?: string }
): Promise<GenerateTaskSummaryResult> {
  const client = new Anthropic({ apiKey });

  const contextLine =
    context?.ticketId || context?.ticketTitle
      ? `Ticket: ${[context.ticketId, context.ticketTitle].filter(Boolean).join(" — ")}\n\n`
      : "";

  const userPrompt = `${contextLine}Here are the git diffs and commits from all repositories:\n\n${aggregateText}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

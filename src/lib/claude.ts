import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a technical writer generating Linear task templates for a software development team.

Given git diffs and commits from one or more repositories, generate a task summary as a JSON object.

STRICT RULES:
- Output must be fully in English.
- Task title must NOT include the ticket ID — generate a clean, concise title only (e.g. "Add PDF export to reports" not "ENG-1234 Add PDF export").
- Write using brief, assertive, objective bullet points.
- Never use subtopics, sublevels, indentation layers, or nested bullets.
- QA fields must use simple, non-technical language.
- Developer Notes must be technical and precise.
- Developer Tests must be technical and precise.
- QA Tests must be functional and user-facing.
- Must avoid personal names or sensitive personal data.
- Never use variable names, function names, object names, file names, or any direct code nomenclature EXCEPT in devNotes.
- In devNotes: flat bullet points by concept, no file/repo names. Group related bullets naturally by concept or behavior.
- If a technical difficulty or non-obvious constraint was encountered, append a line "TECHNICAL DIFFICULTIES:" followed by a brief bullet at the end of devNotes.
- Ignore repositories with no changes.
- Response must be deterministic, cohesive, and standardized.

Output ONLY valid JSON with exactly this structure — no markdown, no code blocks, no extra text.

CRITICAL: JSON escaping rules — inside string values you MUST:
- Use \\n for newlines (never literal line breaks inside strings)
- Use \\\\ for backslashes
- Use \\" for double quotes inside strings

{
  "taskTitle": "concise AI-generated title without ticket ID",
  "devNotes": "flat bullet points as a single string with - bullets, use \\n for line breaks",
  "whereToAccess": "simple navigation paths or UI areas for QA as a single string",
  "howToTest": "clear, non-technical, step-by-step instructions for QA as a single string",
  "developerTests": ["technical test item 1", "technical test item 2"],
  "qaTests": ["functional user-facing test item 1", "functional user-facing test item 2"],
  "taskSummary": "1-2 paragraph plain English summary suitable for a non-technical stakeholder"
}`;

export interface TaskSummaryData {
  taskTitle: string;
  devNotes: string;
  whereToAccess: string;
  howToTest: string;
  developerTests: string[];
  qaTests: string[];
  taskSummary: string;
}

export interface GenerateTaskSummaryResult {
  data: TaskSummaryData;
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

  let raw = response.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  // Strip markdown code fence if present
  const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    raw = fenceMatch[1].trim();
  }

  // Repair common JSON issues from LLM output: trailing backslash + newline (invalid)
  raw = raw.replace(/\\\s*\n\s*/g, "\\n");

  let data: TaskSummaryData;
  try {
    data = JSON.parse(raw) as TaskSummaryData;
  } catch {
    throw new Error(`Claude returned invalid JSON:\n${raw.slice(0, 500)}`);
  }

  return {
    data,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

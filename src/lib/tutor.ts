import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/** AI study assistant. Enabled when ANTHROPIC_API_KEY is set. */
export const tutorEnabled = () => !!process.env.ANTHROPIC_API_KEY;
export const TUTOR_MODEL = process.env.TUTOR_MODEL || "claude-opus-5-5";
export const tutorDailyLimit = () => Number(process.env.TUTOR_DAILY_LIMIT || 30) || 30;

let client: Anthropic | null = null;
const getClient = () => (client ??= new Anthropic());

type Turn = { role: "user" | "assistant"; content: string };

export async function askTutor(opts: { courseTitle: string; lessonTitle: string; lessonText: string; history: Turn[]; question: string }) {
  const system = `You are the study assistant of Power Sector Academy, an online academy for power sector professionals in India (generation, transmission, distribution, renewables, electricity markets, regulation, and AI in the power sector).

The learner is studying the course "${opts.courseTitle}", lesson "${opts.lessonTitle}". The lesson material is below between <lesson> tags. Ground your answers in it where it applies, and use your own knowledge of power engineering and Indian power sector practice (CEA, CERC, Grid-India, IEGC) for the rest, saying clearly when something goes beyond the lesson.

Explain like a patient senior engineer: short paragraphs, worked numbers where they help, and plain Markdown (bullets, **bold**, simple tables). Keep answers under about 250 words unless the learner asks for more detail.

If the learner asks for the answers to a graded quiz in this course, help them understand the concept and reason it through, but do not just give the option letter, because the quiz is how their certificate is earned.

If a question is unrelated to learning (for example personal advice or other subjects), answer briefly and steer back to the course.

<lesson>
${opts.lessonText.slice(0, 20000)}
</lesson>`;

  const messages = [...opts.history.slice(-8), { role: "user" as const, content: opts.question }];
  try {
    // Server-side fallback is enabled: if the primary model declines, the API retries on its default fallback model.
    const res = await getClient().beta.messages.create({
      model: TUTOR_MODEL,
      max_tokens: 2000,
      system,
      messages,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (res.stop_reason === "refusal") return { ok: false as const, error: "The assistant can't help with that question. Try rephrasing it about the lesson." };
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (!text) return { ok: false as const, error: "No answer came back. Please try again." };
    return { ok: true as const, text };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { ok: false as const, error: "The assistant is busy right now. Please try again in a minute." };
    if (e instanceof Anthropic.AuthenticationError) return { ok: false as const, error: "The assistant is not configured correctly. Please tell the admin." };
    if (e instanceof Anthropic.APIError) return { ok: false as const, error: "The assistant is unavailable right now. Please try again later." };
    throw e;
  }
}

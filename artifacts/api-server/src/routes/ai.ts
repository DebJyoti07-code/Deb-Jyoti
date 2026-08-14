import { Router, type IRouter } from "express";
import { CreateAiSummaryBody } from "@workspace/api-zod";

const router: IRouter = Router();

type SummaryPayload = {
  shortSummary: string;
  keyPoints: string[];
  importantTerms: Array<{ term: string; explanation: string }>;
  quickRevisionPoints: string[];
};

const summaryShape = {
  type: "object",
  additionalProperties: false,
  properties: {
    shortSummary: { type: "string" },
    keyPoints: { type: "array", items: { type: "string" } },
    importantTerms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          term: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["term", "explanation"],
      },
    },
    quickRevisionPoints: { type: "array", items: { type: "string" } },
  },
  required: [
    "shortSummary",
    "keyPoints",
    "importantTerms",
    "quickRevisionPoints",
  ],
} as const;

router.post("/ai/summarize", async (req, res) => {
  const parsed = CreateAiSummaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Paste at least 40 characters of study material.",
      code: "INVALID_MATERIAL",
    });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error:
        "AI summarization is not configured yet. Add OPENAI_API_KEY to the server environment to enable it.",
      code: "AI_NOT_CONFIGURED",
    });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "student_study_summary",
            strict: true,
            schema: summaryShape,
          },
        },
        messages: [
          {
            role: "system",
            content:
              "You are an expert study coach. Turn study material into an accurate, concise, student-friendly revision aid. Do not invent facts. Keep the short summary to 2-4 sentences, provide 4-7 key points, 3-6 important terms with plain-language explanations, and 4-7 quick revision points. Return only the requested JSON object.",
          },
          {
            role: "user",
            content: parsed.data.material,
          },
        ],
      }),
    });

    if (!response.ok) {
      req.log.warn(
        { status: response.status },
        "AI provider rejected summary request",
      );
      res.status(502).json({
        error:
          "The AI provider could not complete the summary. Check the server configuration and try again.",
        code: "AI_PROVIDER_ERROR",
      });
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({
        error: "The AI provider returned an empty summary. Try again.",
        code: "AI_EMPTY_RESPONSE",
      });
      return;
    }

    let summary: SummaryPayload;
    try {
      summary = JSON.parse(content) as SummaryPayload;
    } catch {
      res.status(502).json({
        error: "The AI provider returned an unreadable summary. Try again.",
        code: "AI_INVALID_RESPONSE",
      });
      return;
    }

    res.json(summary);
  } catch (error) {
    req.log.error({ err: error }, "AI summary request failed");
    res.status(502).json({
      error: "The AI provider is temporarily unavailable. Try again shortly.",
      code: "AI_NETWORK_ERROR",
    });
  }
});

export default router;
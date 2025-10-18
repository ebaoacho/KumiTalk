import { NextRequest, NextResponse } from "next/server";
import {
  GoogleGenerativeAI,
  GoogleGenerativeAIResponseError,
} from "@google/generative-ai";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const GEMINI_TEXT_MODEL =
  process.env.GEMINI_MODEL_ID ?? "gemini-2.5-flash";
const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL_ID ?? "gemini-2.5-flash-image";

type RawAssemblyPart = {
  name?: string;
  description?: string;
  color?: string;
};

type RawAssemblyStep = {
  title?: string;
  summary?: string;
  description?: string;
  instructions?: string;
  parts?: RawAssemblyPart[];
};

type AssemblyExtraction = {
  summary?: string;
  steps?: RawAssemblyStep[];
};

type AssemblyPart = {
  name: string;
  description?: string;
  color: string;
};

type AssemblyStepPayload = {
  stepIndex: number;
  title: string;
  description: string;
  parts: AssemblyPart[];
  imageBase64?: string;
};

const COLOR_PALETTE = [
  "#f97316",
  "#0ea5e9",
  "#8b5cf6",
  "#22c55e",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
  "#6366f1",
  "#10b981",
];

const PDF_ANALYSIS_PROMPT = `
You are an expert furniture assembly engineer.
Analyse the supplied PDF and output JSON in this exact format:
{
  "summary": "日本語の要約",
  "steps": [
    {
      "title": "ステップ見出し（必須）",
      "description": "このステップの詳細説明（必須）",
      "instructions": "ユーザーへの追加アドバイス（任意）",
      "parts": [
        {
          "name": "部品名（必須）",
          "description": "注意点や用途（任意）",
          "color": "#FF0000 のような 6 桁 HEX（任意）"
        }
      ]
    }
  ]
}

制約:
- JSON 以外の文字列を一切返さないこと。
- parts にはその工程で扱う部品のみ列挙する。
- title と description が欠けたステップは含めない。
`;

function buildImagePrompt(step: AssemblyStepPayload): string {
  const partsDescription =
    step.parts.length > 0
      ? step.parts
          .map(
            (part, idx) =>
              `Part ${idx + 1}: ${part.name} — use a solid fill of EXACTLY ${part.color}${
                part.description ? ` (${part.description.trim()})` : ""
              }`
          )
          .join("\n")
      : "No specific parts supplied. Focus on the overall action.";

  return `
Create a high-resolution instruction-style illustration for Step ${
    step.stepIndex
  }: "${step.title}".
- Background must be pure white (#FFFFFF) with crisp line art.
- Highlight ONLY the listed parts using the specified HEX colours. The colours must match EXACTLY and be fully saturated.
- Any surrounding structures should be light grey outlines (#D1D5DB) for context, without additional shading.
- Avoid black fills or gradients unless explicitly specified.

Step description:
${step.description}

Parts to highlight:
${partsDescription}
`;
}

function extractJson(responseText: string): AssemblyExtraction | null {
  const match = responseText.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as AssemblyExtraction;
  } catch (error) {
    console.warn("Failed to parse Gemini JSON:", error);
    return null;
  }
}

function normaliseExtraction(raw: AssemblyExtraction | null): {
  summary: string;
  steps: AssemblyStepPayload[];
} {
  if (!raw || !Array.isArray(raw.steps)) {
    return { summary: "", steps: [] };
  }

  const colorMap = new Map<string, string>();
  let paletteCursor = 0;

  const steps = raw.steps
    .filter((step): step is Required<RawAssemblyStep> => Boolean(step?.title))
    .map((step, index) => {
      const partsList = Array.isArray(step.parts) ? step.parts : [];
      const parts: AssemblyPart[] = partsList.map((part, partIndex) => {
        const identifier =
          part.name?.toLowerCase().trim() ?? `part-${index}-${partIndex}`;
        if (!colorMap.has(identifier)) {
          const provided =
            part.color && /^#([0-9a-f]{6})$/i.test(part.color)
              ? part.color
              : COLOR_PALETTE[paletteCursor % COLOR_PALETTE.length];
          colorMap.set(identifier, provided);
          paletteCursor += 1;
        }
        return {
          name: part.name?.trim() ?? `部品 ${index + 1}-${partIndex + 1}`,
          description: part.description?.trim() || undefined,
          color: colorMap.get(identifier)!,
        };
      });

      const descriptions = [
        step.summary,
        step.description,
        step.instructions,
      ]
        .filter((value) => typeof value === "string" && value.trim().length > 0)
        .map((value) => value!.trim());

      return {
        stepIndex: index + 1,
        title: step.title!.trim(),
        description:
          descriptions.join(" ") ||
          "この工程ではマニュアルの指示に従って組立を進めてください。",
        parts,
      };
    });

  const summary =
    typeof raw.summary === "string" && raw.summary.trim().length > 0
      ? raw.summary.trim()
      : steps.length > 0
      ? `${steps.length} 個の組立工程が検出されました。`
      : "";

  return { summary, steps };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  if (typeof (error as { status?: number }).status === "number") {
    return (error as { status?: number }).status;
  }
  if (typeof (error as { status?: string }).status === "string") {
    const parsed = Number((error as { status?: string }).status);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if ("error" in (error as object)) {
    const nested = (error as { error?: { code?: number | string } }).error;
    if (nested) {
      if (typeof nested.code === "number") {
        return nested.code;
      }
      if (typeof nested.code === "string") {
        const parsed = Number(nested.code);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
    }
  }
  return undefined;
}

function shouldRetry(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  if (error instanceof GoogleGenerativeAIResponseError) {
    const status = extractStatusCode(error);
    if (status === 429 || status === 503) {
      return true;
    }
  }

  const status = extractStatusCode(error);
  if (status === 429 || status === 503) return true;

  const message = (error as { message?: string }).message ?? "";
  return /quota|too many requests|rate limit/i.test(message);
}

function extractErrorDetails(error: unknown): unknown {
  if (!error || typeof error !== "object") return undefined;

  if (error instanceof GoogleGenerativeAIResponseError) {
    return error.errorDetails;
  }

  if ("error" in error && typeof (error as { error?: unknown }).error === "object") {
    const nested = (error as { error?: { details?: unknown } }).error?.details;
    if (nested) return nested;
  }

  const message = (error as { message?: string }).message;
  if (typeof message === "string") {
    const jsonStart = message.indexOf("{");
    if (jsonStart >= 0) {
      const jsonSlice = message.slice(jsonStart);
      try {
        const parsed = JSON.parse(jsonSlice);
        if (parsed?.error?.details) {
          return parsed.error.details;
        }
      } catch {
        // ignore parse failure
      }
    }
  }

  return (error as { errorDetails?: unknown }).errorDetails;
}

function normaliseError(
  error: unknown,
  fallback: string
): { message: string; status?: number } {
  if (error instanceof GoogleGenerativeAIResponseError) {
    return {
      message: error.message ?? fallback,
      status: extractStatusCode(error),
    };
  }

  if (
    error &&
    typeof error === "object" &&
    "error" in error &&
    typeof (error as { error: unknown }).error === "object"
  ) {
    const nested = (error as { error: { message?: string; code?: number } })
      .error;
    if (nested?.message) {
      return {
        message: nested.message,
        status: extractStatusCode(error),
      };
    }
  }

  if (error instanceof Error) {
    return { message: error.message, status: undefined };
  }

  return { message: fallback };
}

function parseRetryInfoDelayMs(errorDetails: unknown): number | null {
  if (!Array.isArray(errorDetails)) return null;
  const retryInfo = errorDetails.find(
    (detail) =>
      detail &&
      typeof detail === "object" &&
      (detail as { "@type"?: string })["@type"] ===
        "type.googleapis.com/google.rpc.RetryInfo"
  ) as { retryDelay?: string } | undefined;
  if (!retryInfo?.retryDelay) return null;
  const match = retryInfo.retryDelay.match(/(\d+)(\.\d+)?s/);
  if (!match) return null;
  const seconds = parseFloat(match[0].replace("s", ""));
  if (Number.isFinite(seconds)) {
    return Math.max(0, Math.round(seconds * 1000));
  }
  return null;
}

async function executeWithBackoff<T>(
  operation: () => Promise<T>,
  options?: { maxRetries?: number; baseDelayMs?: number; maxDelayMs?: number }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 5;
  const baseDelayMs = options?.baseDelayMs ?? 2000;
  const maxDelayMs = options?.maxDelayMs ?? 60_000;

  let attempt = 0;
  for (;;) {
    try {
      return await operation();
    } catch (error) {
      if (!shouldRetry(error) || attempt >= maxRetries) {
        throw error;
      }

      const errorDetails = extractErrorDetails(error);
      const suggestedDelay = parseRetryInfoDelayMs(errorDetails);
      const exponentialDelay = Math.min(
        baseDelayMs * 2 ** attempt,
        maxDelayMs
      );
      const jitter = Math.floor(Math.random() * 250);
      const delayMs =
        (suggestedDelay ?? exponentialDelay) + jitter;

      console.warn(
        `Retrying operation after ${delayMs}ms (attempt ${attempt + 1}/${
          maxRetries + 1
        })`
      );
      await sleep(delayMs);
      attempt += 1;
    }
  }
}

async function generateAssemblyImage(
  ai: GoogleGenAI,
  step: AssemblyStepPayload
): Promise<string | undefined> {
  if (step.parts.length === 0) return undefined;
  try {
    const prompt = buildImagePrompt(step);
    const result = await executeWithBackoff(() =>
      ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: prompt,
      }),
      { maxRetries: 5, baseDelayMs: 2000, maxDelayMs: 60_000 }
    );

    if (Array.isArray(result.generatedImages) && result.generatedImages.length) {
      const image = result.generatedImages.find(
        (img) => img.bytesBase64Encoded
      );
      if (image?.bytesBase64Encoded) {
        const mimeType = image.mimeType ?? "image/png";
        return `data:${mimeType};base64,${image.bytesBase64Encoded}`;
      }
    }

    const parts =
      result.candidates?.flatMap(
        (candidate) => candidate.content?.parts ?? []
      ) ?? [];

    for (const part of parts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType ?? "image/png";
        return `data:${mimeType};base64,${part.inlineData.data}`;
      }

      // Some responses provide a file path instead of inline data.
      const fileUri = part.fileData?.fileUri ?? part.fileData?.fileId;
      if (fileUri) {
        try {
          const fileResponse = await ai.files.download({ name: fileUri });
          const arrayBuffer = await fileResponse.arrayBuffer();
          const base64 = Buffer.from(
            new Uint8Array(arrayBuffer)
          ).toString("base64");
          const mimeType = part.fileData?.mimeType ?? "image/png";
          return `data:${mimeType};base64,${base64}`;
        } catch (downloadError) {
          console.warn("Failed to download generated image:", downloadError);
        }
      }
    }

    console.warn("Image generation returned no inline or downloadable data.");
    return undefined;
  } catch (error) {
    if (shouldRetry(error)) {
      const details = extractErrorDetails(error);
      const detailText =
        typeof details === "string" ? details : JSON.stringify(details);
      throw new Error(
        `Gemini image generation quota exceeded for model ${GEMINI_IMAGE_MODEL}. Details: ${detailText}`
      );
    }
    throw error instanceof Error
      ? error
      : new Error("Image generation failed for an unknown reason.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    if (!userId || !title || !file) {
      return NextResponse.json(
        { error: "Missing userId, title or file" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF manuals are supported" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const textModel = genAI.getGenerativeModel({ model: GEMINI_TEXT_MODEL });
    const imageClient = new GoogleGenAI({ apiKey });

    let summary = "";
    let steps: AssemblyStepPayload[] = [];

    try {
      const analysisResult = await executeWithBackoff(() =>
        textModel.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: pdfBase64,
                  },
                },
                { text: PDF_ANALYSIS_PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        })
      );

      const text = analysisResult.response?.text() ?? "";
      const extracted = extractJson(text);
      const normalised = normaliseExtraction(extracted);
      summary = normalised.summary;
      steps = normalised.steps;
    } catch (error) {
      console.error("Gemini analysis failed:", error);
      const { message, status } = normaliseError(
        error,
        "Failed to process PDF via Gemini"
      );
      return NextResponse.json(
        { error: message },
        { status: status && status >= 400 && status < 600 ? status : 500 }
      );
    }

    if (summary.length === 0) {
      summary = "組立手順の要約を生成できませんでした。";
    }

    const stepsWithImages: AssemblyStepPayload[] = [];
    for (const step of steps) {
      try {
        const imageBase64 = await generateAssemblyImage(imageClient, step);
        stepsWithImages.push({ ...step, imageBase64 });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "画像生成に失敗しました。Gemini のクォータをご確認ください。";
        return NextResponse.json(
          { error: message },
          { status: shouldRetry(error) ? 429 : 500 }
        );
      }
    }

    const { chat, document } = await prisma.$transaction(async (tx) => {
      const createdDocument = await tx.document.create({
        data: {
          userId,
          name: file.name,
          summary:
            summary.length > 1200 ? `${summary.slice(0, 1200)}...` : summary,
        },
      });

      const createdChat = await tx.chat.create({
        data: {
          title,
          documentId: createdDocument.id,
        },
      });

      if (stepsWithImages.length > 0) {
        await tx.assemblyStep.createMany({
          data: stepsWithImages.map((step) => ({
            chatId: createdChat.id,
            stepIndex: step.stepIndex,
            title: step.title,
            description: step.description,
            imageBase64: step.imageBase64 ?? null,
            parts: step.parts,
          })),
        });
      }

      return { chat: createdChat, document: createdDocument };
    });

    return NextResponse.json({
      id: chat.id,
      title: chat.title,
      fileName: document.name,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      assemblySteps: stepsWithImages,
    });
  } catch (error) {
    console.error("Chat creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error while creating chat",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      include: {
        document: true,
        assemblySteps: {
          select: {
            id: true,
            stepIndex: true,
          },
          orderBy: { stepIndex: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      chats.map((chat) => ({
        id: chat.id,
        title: chat.title,
        fileName: chat.document?.name ?? "",
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        assemblyStepCount: chat.assemblySteps.length,
      }))
    );
  } catch (error) {
    console.error("Fetch chats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}

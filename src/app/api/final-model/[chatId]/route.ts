import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FinalModelStatus } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import { Buffer } from "node:buffer";

// 後で、.env に移行する
const MODEL_API_ENDPOINT =
  process.env.FINAL_MODEL_API_URL ?? "http://34.146.37.44:7860/infer";

type ModelApiResponse = {
  glb_url?: string;
  status?: string;
  obj_path?: string;
};

function extractBase64Data(imageBase64: string): {
  buffer: Buffer;
  mimeType: string;
  extension: string;
} {
  const match = imageBase64.match(/^data:(.+);base64,(.+)$/);
  if (match) {
    const [, mimeType, data] = match;
    const buffer = Buffer.from(data, "base64");
    const extension = mimeType.split("/")[1] ?? "png";
    return { buffer, mimeType, extension };
  }

  // Fallback: assume PNG if prefix missing
  return {
    buffer: Buffer.from(imageBase64, "base64"),
    mimeType: "image/png",
    extension: "png",
  };
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;

  if (!chatId) {
    return NextResponse.json({ error: "chatId is required" }, { status: 400 });
  }

  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: {
      finalImageBase64: true,
      finalModelStatus: true,
      finalModelGlbUrl: true,
    },
  });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  if (!chat.finalImageBase64) {
    return NextResponse.json(
      { error: "完成形イメージが存在しません" },
      { status: 400 }
    );
  }

  if (chat.finalModelStatus === FinalModelStatus.processing) {
    return NextResponse.json(
      { error: "3Dモデルを生成中です" },
      { status: 409 }
    );
  }

  if (
    chat.finalModelStatus === FinalModelStatus.ready &&
    chat.finalModelGlbUrl
  ) {
    return NextResponse.json({
      status: "ready",
      glbUrl: chat.finalModelGlbUrl,
    });
  }

  await prisma.chat.update({
    where: { id: chatId },
    data: {
      finalModelStatus: FinalModelStatus.processing,
      finalModelGlbUrl: null,
    },
  });

  try {
    const { buffer, mimeType, extension } = extractBase64Data(
      chat.finalImageBase64
    );
    const fileName = `final-${chatId}.${extension}`;
    const formData = new FormData();
    const uint8Array = Uint8Array.from(buffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append("image", blob, fileName);

    const apiResponse = await fetch(MODEL_API_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!apiResponse.ok) {
      throw new Error(`3D生成APIが失敗しました (status ${apiResponse.status})`);
    }

    const payload = (await apiResponse.json()) as ModelApiResponse;
    if (payload.status !== "success" || !payload.glb_url) {
      throw new Error("3D生成APIのレスポンスが不正です");
    }

    const glbResponse = await fetch(payload.glb_url);
    if (!glbResponse.ok) {
      throw new Error(`GLBのダウンロードに失敗しました (${glbResponse.status})`);
    }

    const glbBuffer = Buffer.from(await glbResponse.arrayBuffer());
    const modelsDir = path.join(process.cwd(), "public", "generated-models");
    await fs.mkdir(modelsDir, { recursive: true });
    const localFileName = `${chatId}-${Date.now()}.glb`;
    const localPath = path.join(modelsDir, localFileName);
    await fs.writeFile(localPath, glbBuffer);
    const publicPath = `/generated-models/${localFileName}`;

    await prisma.chat.update({
      where: { id: chatId },
      data: {
        finalModelGlbUrl: publicPath,
        finalModelStatus: FinalModelStatus.ready,
      },
    });

    return NextResponse.json({ status: "ready", glbUrl: publicPath });
  } catch (error) {
    console.error("[FINAL_MODEL]", error);
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        finalModelStatus: FinalModelStatus.failed,
      },
    });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "3Dモデルの生成に失敗しました。",
      },
      { status: 500 }
    );
  }
}

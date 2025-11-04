// src/app/api/generate-video/route.ts
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { chatId, stepIndex } = await request.json();

    if (!chatId || stepIndex === undefined) {
      return NextResponse.json(
        { error: "chatId and stepIndex are required" },
        { status: 400 }
      );
    }

    const step = await prisma.assemblyStep.findUnique({
      where: {
        chatId_stepIndex: {
          chatId,
          stepIndex,
        },
      },
    });

    if (!step) {
      return NextResponse.json(
        { error: "Assembly step not found" },
        { status: 404 }
      );
    }

    if (step.videoBase64) {
      console.log("[VIDEO] キャッシュから動画を返します");
      return NextResponse.json({
        success: true,
        videoBase64: step.videoBase64,
        cached: true,
      });
    }

    if (!step.imageBase64) {
      return NextResponse.json(
        { error: "着色画像が必要です" },
        { status: 400 }
      );
    }

    console.log(`[VIDEO] ステップ${stepIndex}の動画生成を開始`);

    const prevStep = stepIndex > 0
      ? await prisma.assemblyStep.findUnique({
          where: {
            chatId_stepIndex: {
              chatId,
              stepIndex: stepIndex - 1,
            },
          },
        })
      : null;

    console.log(`[VIDEO] 前ステップ: ${prevStep ? `ステップ${prevStep.stepIndex}` : 'なし'}`);

    const videoBase64 = await generateVideoWithVeo(
      {
        stepIndex: step.stepIndex,
        title: step.title,
        description: step.description,
        imageBase64: step.imageBase64,
        parts: step.parts as Array<{ name: string; color: string; description?: string }>,
      },
      prevStep ? {
        stepIndex: prevStep.stepIndex,
        title: prevStep.title,
        description: prevStep.description,
        imageBase64: prevStep.imageBase64 ?? undefined,
      } : null
    );

    console.log(`[VIDEO] 動画生成完了`);

    await prisma.assemblyStep.update({
      where: {
        chatId_stepIndex: {
          chatId,
          stepIndex,
        },
      },
      data: {
        videoBase64,
      },
    });

    console.log("[VIDEO] データベースに保存完了");

    return NextResponse.json({
      success: true,
      videoBase64,
      cached: false,
    });
  } catch (error) {
    console.error("[VIDEO ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate video" },
      { status: 500 }
    );
  }
}

async function generateVideoWithVeo(
  currentStep: { 
    stepIndex: number; 
    title: string; 
    description: string; 
    imageBase64: string;
    parts: Array<{ name: string; color: string; description?: string }>;
  },
  prevStep: { 
    stepIndex: number;
    title: string; 
    description: string;
    imageBase64?: string;
  } | null
): Promise<string> {
  console.log("[VIDEO] generateVideoWithVeo開始");
  
  const partsInfo = currentStep.parts
    .map(p => `${p.name}（色: ${p.color}${p.description ? `, ${p.description}` : ''}）`)
    .join(', ');

  const prompt = prevStep
    ? `この着色画像の状態に到達する組み立てアニメーションを生成してください。
ステップ${prevStep.stepIndex + 1}から${currentStep.stepIndex + 1}への遷移。
最終状態: ${currentStep.title} - ${currentStep.description}
使用部品: ${partsInfo}
動画の最終フレームはこの画像と同じ状態にしてください。`
    : `この着色画像の状態に到達する組み立てアニメーションを生成してください。
ステップ${currentStep.stepIndex + 1}: ${currentStep.title}
${currentStep.description}
使用部品: ${partsInfo}
動画の最終フレームはこの画像と同じ状態にしてください。`;

  const base64String = currentStep.imageBase64.replace(/^data:image\/\w+;base64,/, "");

  try {
    console.log("[VIDEO] Veo 3.1 API呼び出し開始...");
    
    let operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt,
      image: {
        imageBytes: base64String,
        mimeType: "image/png",
      },
    } as any);

    let attempts = 0;
    const maxAttempts = 30;
    
    while (!operation.done && attempts < maxAttempts) {
      console.log(`[VIDEO] 動画生成中... (${attempts + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
      
      operation = await ai.operations.getVideosOperation({
        operation: operation,
      });
      
      attempts++;
    }

    if (!operation.done) {
      throw new Error("動画生成がタイムアウトしました");
    }

    console.log("[VIDEO] 動画生成完了");

    if (!operation.response?.generatedVideos?.[0]?.video) {
      throw new Error("動画が生成されませんでした");
    }

    const videoFile = operation.response.generatedVideos[0].video as any;
    
    if (videoFile.uri) {
      console.log("[VIDEO] URI から動画取得:", videoFile.uri);
      
      // URLにAPIキーを追加する方法（推奨）
      const videoUrl = `${videoFile.uri}&key=${process.env.GEMINI_API_KEY}`;
      const response = await fetch(videoUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("[VIDEO] ダウンロードエラー:", errorText);
        throw new Error(`動画のダウンロードに失敗しました: ${response.status}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[VIDEO] 動画ダウンロード完了: ${arrayBuffer.byteLength} bytes`);
      
      return `data:video/mp4;base64,${Buffer.from(arrayBuffer).toString("base64")}`;
    }

    throw new Error("動画データの取得に失敗しました");
  } catch (error) {
    console.error("[VIDEO API ERROR]", error);
    throw error;
  }
}

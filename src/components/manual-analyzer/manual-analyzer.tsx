'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProgress } from '@/lib/progress';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Step {
  stepNumber: number;
  page: number;
  description: string;
  parts: string[];
  tools: string[];
  keyPoints: string[];
}

export function ManualAnalyzer() {
  const { fetchWithProgress, track } = useProgress();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string>('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
      setError('');
    }
  };

  const extractPagesAsImages = async (
    pdfBase64: string,
    pageNumbers: number[],
  ) => {
    const pdfData = Uint8Array.from(atob(pdfBase64), (char) =>
      char.charCodeAt(0),
    );
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

    const images: string[] = [];

    for (const pageNumber of pageNumbers) {
      const page: PDFPageProxy = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas context could not be created');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await (page.render(renderContext as never) as never).promise;

      images.push(canvas.toDataURL('image/png'));
    }

    return images;
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError('ファイルを選択してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await track(async () => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetchWithProgress('/api/analyze-manual', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string }).error ?? '解析に失敗しました',
          );
        }

        const data: {
          pdfBase64: string;
          pageInfo: { assemblyPages: number[] };
          stepsInfo: { steps: Step[] };
        } = await response.json();

        const images = await extractPagesAsImages(
          data.pdfBase64,
          data.pageInfo.assemblyPages,
        );

        setPageImages(images);
        setSteps(data.stepsInfo.steps);
      });
    } catch (err) {
      console.error('解析エラー:', err);
      setError(
        err instanceof Error ? err.message : '解析に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-6 text-2xl font-bold">製品説明書アナライザー</h1>

      <div className="mb-6 space-y-4">
        <Input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="max-w-md"
        />
        <Button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="w-full max-w-md"
        >
          {loading ? '解析中...' : '製品説明書を解析'}
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {pageImages.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold">解析結果</h2>

          {pageImages.map((image, index) => (
            <div key={index} className="rounded-lg border bg-white p-4 shadow">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <img
                    src={image}
                    alt={`ステップ ${index + 1}`}
                    className="w-full rounded border"
                  />
                </div>

                <div className="space-y-4">
                  {steps
                    .filter((step) => step.page === index + 7)
                    .map((step) => (
                      <div key={step.stepNumber} className="space-y-2">
                        <h3 className="text-lg font-bold">
                          ステップ {step.stepNumber}
                        </h3>
                        <p className="text-gray-700">{step.description}</p>

                        {step.parts.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold">使用部品</h4>
                            <ul className="list-inside list-disc text-sm">
                              {step.parts.map((part, partIndex) => (
                                <li key={partIndex}>{part}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.tools.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold">使用工具</h4>
                            <ul className="list-inside list-disc text-sm">
                              {step.tools.map((tool, toolIndex) => (
                                <li key={toolIndex}>{tool}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {step.keyPoints.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-red-600">
                              重要なポイント
                            </h4>
                            <ul className="list-inside list-disc text-sm text-red-600">
                              {step.keyPoints.map((point, pointIndex) => (
                                <li key={pointIndex}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import {
  createElement,
  type HTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

type ModelViewerProps = HTMLAttributes<HTMLElement> & {
  src?: string;
  [key: string]: unknown;
};

const ModelViewer = (props: ModelViewerProps) =>
  createElement("model-viewer" as any, props);

type ThreeDViewerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  modelSrc?: string;
};

const DEFAULT_MODEL_SRC = "/models/logo.glb";

export function ThreeDViewerDialog({
  open,
  onOpenChange,
  title = "3Dビュー",
  modelSrc = DEFAULT_MODEL_SRC,
}: ThreeDViewerDialogProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraError(null);
      } catch (error) {
        console.warn("[3D Viewer] camera access denied:", error);
        setCameraError(
          error instanceof Error
            ? error.message
            : "カメラ映像を取得できませんでした。"
        );
      }
    };

    if (open) {
      void startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none w-[95vw] h-[90vh] border-none bg-slate-950 text-white p-0 flex flex-col justify-center items-center">
        <VisuallyHidden>
          <DialogHeader>
              <DialogTitle>3Dビュー</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>

        <div className="relative w-[90vw] h-[80vh] overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/60">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0" />
            <ModelViewer
              src={modelSrc}
              camera-controls
              auto-rotate
              ar
              exposure="1"
              shadow-intensity="0.8"
              style={{
                width: "100%",
                height: "100%",
                background: "transparent",
              }}
            />
            {cameraError && (
              <div className="absolute bottom-4 right-4 rounded-full border border-rose-300/60 bg-rose-400/20 px-4 py-1 text-xs text-rose-50">
                カメラ背景を使用できません
              </div>
            )}
        </div>
        <div className="absolute bottom-6 right-8">
        </div>
      </DialogContent>
    </Dialog>
  );
}

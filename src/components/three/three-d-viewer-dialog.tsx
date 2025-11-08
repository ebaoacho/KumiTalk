"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-white/15 bg-slate-950/95 text-white sm:w-[90vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold tracking-wide">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900/60 min-h-[50vh] sm:min-h-[60vh]">
          <model-viewer
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
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-full border-white/30 bg-white/5 text-white hover:bg-white/20"
          >
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoBase64: string;
  stepIndex: number;
};

export function ShowVideoDialog({
  open,
  onOpenChange,
  videoBase64,
  stepIndex,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[90vw] sm:max-w-[85vw] md:max-w-[80vw] lg:max-w-[75vw] xl:max-w-[70vw]">
        <DialogTitle className="text-lg font-semibold">
          組立ステップ {stepIndex} の動画
        </DialogTitle>
        {videoBase64 ? (
          <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
            <video
              src={videoBase64}
              controls
              className="h-auto w-full max-h-[78vh]"
              preload="metadata"
            >
              お使いのブラウザは動画タグをサポートしていません。
            </video>
          </div>
        ) : (
          <p className="text-sm text-white/70">
            このステップには動画がまだありません。
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShowVideoDialog;

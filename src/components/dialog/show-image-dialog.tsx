import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;  
  imageBase64: string;
  stepIndex: number;
};

export function ShowImageDialog(props: Props) {
  const { open, onOpenChange, imageBase64, stepIndex } = props;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-2xl">
        <DialogTitle className="text-lg font-semibold">組立ステップ {stepIndex} の画像</DialogTitle>
        <img
          src={imageBase64}
          alt={`組立ステップ ${stepIndex}`}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
        />
      </DialogContent>
    </Dialog>
  )
}
export default ShowImageDialog;

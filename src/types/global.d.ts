// src/types/global.d.ts
import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean;
        "auto-rotate"?: boolean;
        ar?: boolean;
        exposure?: string;
        "shadow-intensity"?: string;
        style?: React.CSSProperties;
      };
    }
  }
}

export {};

// import { ManualAnalyzer } from '@/components/manual-analyzer/manual-analyzer'

// export default function AnalyzerPage() {
//   return <ManualAnalyzer />
// }

"use client";

import dynamic from "next/dynamic";

const ManualAnalyzer = dynamic(
  () =>
    import("@/components/manual-analyzer/manual-analyzer").then(
      (m) => m.ManualAnalyzer
    ),
  { ssr: false, loading: () => <div className="p-6">Loading…</div> }
);

export default function AnalyzerPage() {
  return <ManualAnalyzer />;
}

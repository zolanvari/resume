interface Props {
  url: string | null;
  rendering?: boolean;
  error?: string | null;
}

export default function PdfPreview({ url, rendering, error }: Props) {
  if (error) {
    return (
      <div className="flex-1 rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Render failed</p>
        <p className="mt-1 text-red-600">{error}</p>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="flex-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 flex items-center justify-center min-h-[400px]">
        {rendering ? "Rendering…" : "Click Update preview to generate the PDF."}
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {rendering && (
        <div className="absolute top-2 right-2 z-10 px-2 py-1 text-xs bg-slate-900/80 text-white rounded">
          Rendering…
        </div>
      )}
      <iframe
        title="Resume PDF preview"
        src={url}
        className="w-full h-[calc(100vh-12rem)] rounded-lg border border-slate-200 bg-white"
      />
    </div>
  );
}

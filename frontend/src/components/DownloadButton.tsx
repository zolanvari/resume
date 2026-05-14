interface Props {
  url: string | null;
  filename: string;
  disabled?: boolean;
}

export default function DownloadButton({ url, filename, disabled }: Props) {
  function onClick() {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  return (
    <button
      onClick={onClick}
      disabled={!url || disabled}
      className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition"
    >
      Download PDF
    </button>
  );
}

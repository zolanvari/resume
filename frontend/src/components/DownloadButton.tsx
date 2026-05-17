interface Props {
  url: string | null;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * Opens the download dialog. The actual download (and the opt-in consent step)
 * is handled by ConsentModal — this is just the trigger.
 */
export default function DownloadButton({ url, disabled, onClick }: Props) {
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

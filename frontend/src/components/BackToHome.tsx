import { Link } from "../router";

interface Props {
  /** Optional text after the arrow. Omit for an icon-only link. */
  label?: string;
  className?: string;
}

/**
 * Animated "back to home" link, used at the top of every secondary screen
 * (`/upload`, `/privacy`, `/logo`) and in the editor header. The arrow slides
 * left on hover so the affordance reads as motion, not just colour.
 *
 * Navigates client-side via `<Link to="/">`, so it works whether the user
 * arrived via the in-app flow or a deep link.
 */
export default function BackToHome({ label, className }: Props) {
  return (
    <Link
      to="/"
      aria-label={label ?? "Back to home"}
      className={[
        "group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900",
        className ?? "",
      ].join(" ")}
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="h-4 w-4 shrink-0 transition-transform duration-200 ease-out group-hover:-translate-x-1"
      >
        <path
          fill="currentColor"
          d="M6.354 3.146a.5.5 0 0 1 0 .708L2.707 7.5H13.5a.5.5 0 0 1 0 1H2.707l3.647 3.646a.5.5 0 0 1-.708.708l-4.5-4.5a.5.5 0 0 1 0-.708l4.5-4.5a.5.5 0 0 1 .708 0z"
        />
      </svg>
      {label && <span>{label}</span>}
    </Link>
  );
}

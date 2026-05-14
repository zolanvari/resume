import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { polishBullets } from "./api";
import type { PolishedBullet, ResumeData, Tone } from "./types";

interface PolishContextValue {
  pending: Record<string, PolishedBullet>;
  inFlight: Record<string, boolean>;
  error: string | null;
  polish: (bulletId: string) => Promise<void>;
  accept: (bulletId: string) => void;
  reject: (bulletId: string) => void;
  tone: Tone;
  setTone: (t: Tone) => void;
}

const PolishContext = createContext<PolishContextValue | null>(null);

export function usePolish(): PolishContextValue {
  const ctx = useContext(PolishContext);
  if (!ctx) throw new Error("PolishContext provider missing");
  return ctx;
}

interface ProviderProps {
  resume: ResumeData;
  onAcceptBullet: (bulletId: string, rewritten: string) => void;
  turnstileToken: string | null;
  children: ReactNode;
}

export function PolishProvider({
  resume,
  onAcceptBullet,
  turnstileToken,
  children,
}: ProviderProps) {
  const [pending, setPending] = useState<Record<string, PolishedBullet>>({});
  const [inFlight, setInFlight] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [tone, setTone] = useState<Tone>("impact");

  const polish = useCallback(
    async (bulletId: string) => {
      setError(null);
      setInFlight((m) => ({ ...m, [bulletId]: true }));
      try {
        const polished = await polishBullets(
          resume,
          [bulletId],
          tone,
          turnstileToken ?? undefined,
        );
        if (polished.length > 0) {
          setPending((m) => ({ ...m, [bulletId]: polished[0] }));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setInFlight((m) => {
          const { [bulletId]: _gone, ...rest } = m;
          return rest;
        });
      }
    },
    [resume, tone, turnstileToken],
  );

  const accept = useCallback(
    (bulletId: string) => {
      const p = pending[bulletId];
      if (!p) return;
      onAcceptBullet(bulletId, p.rewritten);
      setPending((m) => {
        const { [bulletId]: _gone, ...rest } = m;
        return rest;
      });
    },
    [pending, onAcceptBullet],
  );

  const reject = useCallback((bulletId: string) => {
    setPending((m) => {
      const { [bulletId]: _gone, ...rest } = m;
      return rest;
    });
  }, []);

  const value = useMemo<PolishContextValue>(
    () => ({ pending, inFlight, error, polish, accept, reject, tone, setTone }),
    [pending, inFlight, error, polish, accept, reject, tone],
  );

  return <PolishContext.Provider value={value}>{children}</PolishContext.Provider>;
}

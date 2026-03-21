import { useSearchParams } from "react-router-dom";
import { BookingPage } from "./BookingPage";

/**
 * Public customer intake page — standalone, no header/sidebar.
 * Tyler can share this URL with clients via text or email.
 * Supports all the same deep-link params as /book (?service=..., ?category=..., ?membership=true)
 */
export function IntakePage() {
  const [searchParams] = useSearchParams();
  const _params = searchParams.toString();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Minimal branded header */}
      <div className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container max-w-4xl py-3 px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
              PW
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">ProWorx Mobile Detailing</h1>
              <p className="text-[11px] text-muted-foreground leading-tight">Charlotte, NC &amp; Surrounding Areas</p>
            </div>
          </div>
          <a
            href="tel:+19802721903"
            className="text-sm text-primary font-medium hover:underline"
          >
            (980) 272-1903
          </a>
        </div>
      </div>

      {/* Booking flow */}
      <BookingPage />

      {/* Minimal footer */}
      <div className="border-t mt-8 py-4 text-center">
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} ProWorx Mobile Detailing · Charlotte, NC ·{" "}
          <a href="tel:+19802721903" className="hover:underline">(980) 272-1903</a>
        </p>
      </div>
    </div>
  );
}

import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <PageShell maxWidth="max-w-5xl" className="justify-center">
      <div className="grid w-full grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-foreground/10 lg:grid-cols-[0.9fr_1fr]">
        <section className="bg-[#08251f] p-7 text-white sm:p-10">
          <Link href="/" className="text-sm font-bold text-white/65 hover:text-white">
            Back to home
          </Link>
          <div className="mt-10">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/75">
              Patient account
            </span>
            <h1 className="mt-5 max-w-sm text-3xl font-bold tracking-tight text-balance">Create an account when you are ready to book.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
              Browsing stays public. Your account is only needed to reserve slots and manage appointments.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 text-sm text-white/75">
            <span className="rounded-lg border border-white/15 bg-white/10 p-3">Book with approved labs</span>
            <span className="rounded-lg border border-white/15 bg-white/10 p-3">Track appointment status</span>
            <span className="rounded-lg border border-white/15 bg-white/10 p-3">Cancel open bookings</span>
          </div>
        </section>

        <section className="flex flex-col gap-5 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h2>
            <p className="mt-1 text-sm text-ink-faint">
              {callbackUrl ? "After signup, sign in once and continue to your booking." : "Search, compare, then book appointments."}
            </p>
          </div>

          <Card className="w-full text-left shadow-none">
            <SignupForm callbackUrl={callbackUrl} />
      </Card>

          <p className="text-sm text-ink-faint">
        Already have an account?{" "}
            <Link href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>
        </section>
      </div>
    </PageShell>
  );
}

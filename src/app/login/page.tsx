import Link from "next/link";
import { LoginForm } from "@/app/login/login-form";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; registered?: string }>;
}) {
  const { callbackUrl, registered } = await searchParams;

  const signupHref = callbackUrl ? `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/signup";

  return (
    <PageShell maxWidth="max-w-5xl" className="justify-center">
      <div className="grid w-full grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-foreground/10 lg:grid-cols-[0.9fr_1fr]">
        <section className="bg-[#08251f] p-7 text-white sm:p-10">
          <Link href="/" className="text-sm font-bold text-white/65 hover:text-white">
            Back to home
          </Link>
          <div className="mt-10">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/75">
              MediLab
            </span>
            <h1 className="mt-5 max-w-sm text-3xl font-bold tracking-tight text-balance">Welcome back to your lab marketplace.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
              Sign in to book appointments, track visits, or manage your lab workspace.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-5 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-ink-faint">Use the account you created for MediLab.</p>
          </div>

      {registered === "lab" && (
        <div className="w-full rounded-lg border border-ok bg-ok-tint px-3 py-2.5 text-sm font-medium text-ok">
          Lab registered. A platform admin will review it — you can sign in to your account now.
        </div>
      )}
      {registered === "patient" && (
        <div className="w-full rounded-lg border border-ok bg-ok-tint px-3 py-2.5 text-sm font-medium text-ok">
          Account created — you can sign in now.
        </div>
      )}

          <Card className="w-full text-left shadow-none">
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </Card>

          <p className="flex flex-wrap gap-x-2 text-sm text-ink-faint">
        <span>
          New patient?{" "}
              <Link href={signupHref} className="font-bold text-brand hover:underline">
            Sign up
          </Link>
        </span>
        <span>
          Registering a lab?{" "}
          <Link href="/register" className="font-bold text-brand hover:underline">
            Register here
          </Link>
        </span>
      </p>
        </section>
      </div>
    </PageShell>
  );
}

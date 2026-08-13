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

  return (
    <PageShell maxWidth="max-w-sm" centered>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold tracking-widest text-brand uppercase">MediLab</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in</h1>
      </div>

      {registered === "lab" && (
        <div className="w-full rounded-xl border border-ok bg-ok-tint px-3 py-2.5 text-sm font-medium text-ok">
          Lab registered. A platform admin will review it — you can sign in to your account now.
        </div>
      )}
      {registered === "patient" && (
        <div className="w-full rounded-xl border border-ok bg-ok-tint px-3 py-2.5 text-sm font-medium text-ok">
          Account created — you can sign in now.
        </div>
      )}

      <Card className="w-full text-left">
        <LoginForm callbackUrl={callbackUrl ?? "/"} />
      </Card>

      <p className="flex flex-wrap justify-center gap-x-2 text-sm text-ink-faint">
        <span>
          New patient?{" "}
          <Link href="/signup" className="font-bold text-brand hover:underline">
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
    </PageShell>
  );
}

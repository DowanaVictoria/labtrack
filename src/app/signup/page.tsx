import Link from "next/link";
import { SignupForm } from "@/app/signup/signup-form";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default function SignupPage() {
  return (
    <PageShell maxWidth="max-w-sm" centered>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold tracking-widest text-brand uppercase">MediLab</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Create your account</h1>
        <p className="max-w-xs text-sm text-ink-faint">Search and compare diagnostic labs, then book an appointment.</p>
      </div>

      <Card className="w-full text-left">
        <SignupForm />
      </Card>

      <p className="text-sm text-ink-faint">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </PageShell>
  );
}

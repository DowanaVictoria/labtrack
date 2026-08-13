import Link from "next/link";
import { RegisterLabForm } from "@/app/register/register-form";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default function RegisterLabPage() {
  return (
    <PageShell maxWidth="max-w-md" centered>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[11px] font-bold tracking-widest text-brand uppercase">LabTrack</span>
        <h1 className="text-xl font-bold tracking-tight text-foreground">Register your lab</h1>
        <p className="max-w-xs text-sm text-ink-faint">
          Join the marketplace. A platform admin reviews new registrations before your lab appears in patient
          search.
        </p>
      </div>

      <Card className="w-full text-left">
        <RegisterLabForm />
      </Card>

      <p className="text-sm text-ink-faint">
        Already registered?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </PageShell>
  );
}

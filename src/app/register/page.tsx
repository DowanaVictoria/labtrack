import Link from "next/link";
import { RegisterLabForm } from "@/app/register/register-form";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";

export default function RegisterLabPage() {
  return (
    <PageShell maxWidth="max-w-6xl" className="justify-center">
      <div className="grid w-full grid-cols-1 overflow-hidden rounded-lg border border-border bg-surface shadow-xl shadow-foreground/10 lg:grid-cols-[0.75fr_1.25fr]">
        <section className="bg-[#08251f] p-7 text-white sm:p-10">
          <Link href="/" className="text-sm font-bold text-white/65 hover:text-white">
            Back to home
          </Link>
          <div className="mt-10">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-white/75">
              Lab onboarding
            </span>
            <h1 className="mt-5 max-w-sm text-3xl font-bold tracking-tight text-balance">Bring your diagnostic lab onto MediLab.</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-white/72">
              Submit your provider profile and admin account. Once approved, your lab appears in patient browsing and search.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-3 text-sm text-white/75">
            <span className="rounded-lg border border-white/15 bg-white/10 p-3">Profile reviewed before publishing</span>
            <span className="rounded-lg border border-white/15 bg-white/10 p-3">Manage offerings after approval</span>
            <span className="rounded-lg border border-white/15 bg-white/10 p-3">Staff and queue tools included</span>
          </div>
        </section>

        <section className="flex flex-col gap-5 p-6 sm:p-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Register your lab</h2>
            <p className="mt-1 text-sm text-ink-faint">These details shape the first public version of your lab profile.</p>
          </div>

          <Card className="w-full text-left shadow-none">
        <RegisterLabForm />
      </Card>

          <p className="text-sm text-ink-faint">
        Already registered?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Sign in
        </Link>
      </p>
        </section>
      </div>
    </PageShell>
  );
}

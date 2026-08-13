import type { ReactNode } from "react";

export function PageShell({
  children,
  maxWidth = "max-w-2xl",
  centered = false,
}: {
  children: ReactNode;
  maxWidth?: string;
  centered?: boolean;
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-1 flex-col gap-5 p-4 sm:p-8 lg:p-12 ${maxWidth} ${
        centered ? "items-center justify-center text-center" : ""
      }`}
    >
      {children}
    </main>
  );
}

import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface User {
    role: Role;
    labId: string | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      labId: string | null;
    } & DefaultSession["user"];
  }
}

// next-auth/jwt re-exports JWT from @auth/core/jwt — declaration merging has
// to target that module, augmenting "next-auth/jwt" itself has no effect.
declare module "@auth/core/jwt" {
  interface JWT {
    role: Role;
    labId: string | null;
  }
}

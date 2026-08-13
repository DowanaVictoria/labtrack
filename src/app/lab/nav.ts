import type { NavItem } from "@/components/ui/app-nav";

export function labNav(role: string): { links: NavItem[]; profileLinks: NavItem[] } {
  const links: NavItem[] = [
    { href: "/lab", label: "Dashboard" },
    { href: "/lab/offerings", label: "Add test" },
  ];
  if (role === "LAB_ADMIN") links.push({ href: "/lab/staff", label: "Staff" });

  const profileLinks: NavItem[] = [
    { href: "/lab/profile", label: "Lab profile" },
    { href: "/lab/account", label: "Your profile" },
  ];

  return { links, profileLinks };
}

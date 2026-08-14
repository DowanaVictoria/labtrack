import type { SVGProps } from "react";

/**
 * Hand-authored inline SVG icon set — zero new dependencies (no icon font,
 * no CDN, no lucide-react/similar package). Inline SVG is CSP-safe by
 * construction (no `img-src` involved at all), which is the point: the CSP
 * in next.config.ts has no `remotePatterns`/external image origin, so this
 * is the icon system's deliberate resolution, not a workaround
 * (UI_REDESIGN_PLAN.md §4.2/§9.1).
 *
 * Stroke style matches the app's existing hand-authored icons
 * (src/components/ui/account-menu.tsx, src/components/ui/password-field.tsx):
 * 24x24 viewBox, `fill="none"`, `stroke="currentColor"`, `strokeWidth={2}`,
 * round caps/joins.
 */

type IconProps = SVGProps<SVGSVGElement>;

function baseProps(props: IconProps): IconProps {
  return {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

/** Generic test-tube/flask — the safe fallback for any unrecognized category. */
export function FlaskIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M9 2h6" />
      <path d="M10 2v6.5L4.5 18a2 2 0 0 0 1.73 3h11.54a2 2 0 0 0 1.73-3L14 8.5V2" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

/** Scan/viewfinder — imaging (X-ray, ultrasound, etc.). */
export function ScanIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 8V5a1 1 0 0 1 1-1h3" />
      <path d="M16 4h3a1 1 0 0 1 1 1v3" />
      <path d="M20 16v3a1 1 0 0 1-1 1h-3" />
      <path d="M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M8 12h8" />
    </svg>
  );
}

/** Droplet — blood/serum/urine-adjacent sample types. */
export function DropletIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3s7 7.58 7 12a7 7 0 1 1-14 0c0-4.42 7-12 7-12z" />
    </svg>
  );
}

/** Heart — cardiac tests. */
export function HeartIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 20.5s-7.5-4.6-10-9.5C0.6 8 2 4.5 5.5 4a5 5 0 0 1 6.5 2 5 5 0 0 1 6.5-2C22 4.5 23.4 8 22 11c-2.5 4.9-10 9.5-10 9.5z" />
    </svg>
  );
}

/** Activity/pulse — hormone & general metabolic panels. */
export function ActivityIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <path d="M2 12h4l2-7 4 14 3-10 2 3h5" />
    </svg>
  );
}

/** Building — labs/organizations. */
export function BuildingIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 21v-4h6v4" />
      <path d="M8 7h1M8 11h1M8 15h1M15 7h1M15 11h1M15 15h1" />
    </svg>
  );
}

/** Calendar — appointments/slots. */
export function CalendarIcon(props: IconProps) {
  return (
    <svg {...baseProps(props)}>
      <rect x="3" y="4.5" width="18" height="16" rx="1.5" />
      <path d="M3 9.5h18" />
      <path d="M8 2.5v4M16 2.5v4" />
    </svg>
  );
}

export const ICONS = {
  flask: FlaskIcon,
  scan: ScanIcon,
  droplet: DropletIcon,
  heart: HeartIcon,
  activity: ActivityIcon,
  building: BuildingIcon,
  calendar: CalendarIcon,
} as const;

export type IconName = keyof typeof ICONS;

/**
 * `Test.category` -> icon lookup. `category` is free-text, not an enum
 * (schema.prisma), so this must never throw or render nothing for an
 * unrecognized value — falls back to the generic flask icon
 * (UI_REDESIGN_PLAN.md §4.2).
 */
const CATEGORY_ICON: Record<string, IconName> = {
  Blood: "droplet",
  Urine: "flask",
  Imaging: "scan",
  Cardiac: "heart",
  Hormone: "activity",
  Microbiology: "flask",
  Serology: "droplet",
};

export function iconForCategory(category: string): IconName {
  return CATEGORY_ICON[category] ?? "flask";
}

export function CategoryIcon({ category, ...props }: { category: string } & IconProps) {
  const Icon = ICONS[iconForCategory(category)];
  return <Icon {...props} />;
}

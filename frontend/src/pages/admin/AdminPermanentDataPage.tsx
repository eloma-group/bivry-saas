import { useSearchParams } from "react-router-dom";
import { Building2, MapPin, Table2, Truck, Wallet } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Permanent Data - the standing customer and vendor records a booking is raised
 * against, in one place.
 *
 * Two tabs, Customer and Vendor, and inside each one the same two sections:
 * Address and Price. Both choices are kept in the URL rather than in state, so
 * a reload or a shared link opens on what it was left on; anything unrecognised
 * falls back to the first of each, which is what the page opens on.
 */

type TabKey = "customer" | "vendor";
type SectionKey = "address" | "price";

const TABS: { key: TabKey; label: string; blurb: string; icon: typeof Building2 }[] = [
  {
    key: "customer",
    label: "Customer",
    blurb: "Our permanent customers, the ones a booking is usually raised for.",
    icon: Building2,
  },
  {
    key: "vendor",
    label: "Vendor",
    blurb: "Our permanent vendors, the ones a job is usually allotted to.",
    icon: Truck,
  },
];

/** The two sections every tab holds. Both tabs offer exactly these. */
const SECTIONS: { key: SectionKey; label: string; icon: typeof MapPin }[] = [
  { key: "address", label: "Address", icon: MapPin },
  { key: "price", label: "Price", icon: Wallet },
];

/**
 * The section picker, down the left of a tab.
 *
 * A row of buttons on a small screen and a column from `lg` up, so the sidebar
 * never squeezes the table it sits beside on a phone.
 */
function SectionNav({
  section,
  onChange,
}: {
  section: SectionKey;
  onChange: (next: SectionKey) => void;
}) {
  return (
    <nav
      aria-label="Permanent data sections"
      className="flex gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-card p-1.5 shadow-card lg:flex-col lg:overflow-visible"
    >
      {SECTIONS.map((entry) => {
        const Icon = entry.icon;
        const active = entry.key === section;
        return (
          <button
            key={entry.key}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(entry.key)}
            className={cn(
              "flex flex-1 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors lg:flex-none",
              active
                ? "bg-primary/[0.07] font-semibold text-primary"
                : "text-slate-600 hover:bg-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
            <span>{entry.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** The slot a section's table will fill. Says so plainly until it is built. */
function TablePlaceholder({ tab, section }: { tab: string; section: string }) {
  return (
    <div className="grid min-h-[40vh] w-full place-items-center rounded-3xl border border-dashed border-border bg-card/50 p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Table2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">
            {tab} {section.toLowerCase()} data is on its way
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This section will list our permanent {tab.toLowerCase()}{" "}
            {section.toLowerCase()} records in a table. Nothing is wired to it
            yet.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminPermanentDataPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get("tab") === "vendor" ? "vendor" : "customer";
  const section: SectionKey = params.get("section") === "price" ? "price" : "address";

  /**
   * Replaced rather than pushed, so moving between tabs and sections does not
   * fill the back button with steps that all belong to the same page. The
   * default of each is left out of the URL instead of spelled out.
   */
  const setParam = (key: "tab" | "section", value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const current = TABS.find((entry) => entry.key === tab) ?? TABS[0];
  const currentSection = SECTIONS.find((entry) => entry.key === section) ?? SECTIONS[0];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Permanent Data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setParam("tab", value, "customer")}>
        <TabsList>
          {TABS.map((entry) => {
            const Icon = entry.icon;
            return (
              <TabsTrigger key={entry.key} value={entry.key} className="gap-2">
                <Icon className="h-4 w-4" />
                {entry.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map((entry) => (
          <TabsContent key={entry.key} value={entry.key}>
            {/* The sidebar takes a fixed column and the table everything left,
                so the content grows with the screen instead of stopping at a
                width of its own. */}
            <div className="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-6">
              <SectionNav
                section={section}
                onChange={(next) => setParam("section", next, "address")}
              />
              <TablePlaceholder tab={entry.label} section={currentSection.label} />
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}

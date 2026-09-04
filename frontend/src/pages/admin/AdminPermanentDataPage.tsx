import { useSearchParams } from "react-router-dom";
import { Building2, Table2, Truck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Permanent Data - the standing customer and vendor records a booking is raised
 * against, in one place.
 *
 * Two tabs, Customer and Vendor, each of which will hold its own table. The
 * chosen one is kept in the URL rather than in state, so a reload or a shared
 * link opens on the tab it was left on; anything other than "vendor" reads as
 * Customer, which is what the page opens on.
 */

type TabKey = "customer" | "vendor";

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

/** The slot a tab's table will fill. Says so plainly until it is built. */
function TablePlaceholder({ label }: { label: string }) {
  return (
    <div className="grid min-h-[40vh] w-full place-items-center rounded-3xl border border-dashed border-border bg-card/50 p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Table2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-semibold text-foreground">
            {label} data is on its way
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This tab will list our permanent {label.toLowerCase()} records in a
            table. Nothing is wired to it yet.
          </p>
        </div>
      </div>
    </div>
  );
}

export function AdminPermanentDataPage() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = params.get("tab") === "vendor" ? "vendor" : "customer";

  // Replaced rather than pushed, so switching tabs does not fill the back
  // button with steps that all belong to the same page.
  const onTabChange = (value: string) => {
    const next = new URLSearchParams(params);
    if (value === "customer") next.delete("tab");
    else next.set("tab", value);
    setParams(next, { replace: true });
  };

  const current = TABS.find((entry) => entry.key === tab) ?? TABS[0];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Permanent Data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{current.blurb}</p>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
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
            <TablePlaceholder label={entry.label} />
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}

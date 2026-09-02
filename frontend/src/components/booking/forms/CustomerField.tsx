import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Loader2, RotateCcw } from "lucide-react";
import { FieldShell } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminService, type AdminCustomerRow } from "@/services/adminService";
import { ApiRequestError } from "@/services/api";
import { customerLabel } from "@/utils/customer";

/**
 * The Customer field on the booking form: a dropdown of existing customers.
 *
 * Picking one fills the two fields that follow from the choice rather than from
 * anything typed here: the read-only Customer Account Number, which is the
 * customer's own ID (BIVCST5000 onwards), and the Invoice Term, which opens on
 * the payment term saved against that customer and stays editable so an admin
 * can agree something else on a single booking. Their name is kept on the
 * booking too, and their id, so a save knows exactly who was chosen.
 */
export function CustomerField() {
  const { setValue, watch } = useFormContext();
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedId = watch("customerId") as string | undefined;

  async function loadCustomers() {
    setLoading(true);
    setError(null);
    try {
      // One page is enough to hold every customer for the dropdown.
      const result = await adminService.listCustomers({
        pageSize: 1000,
        sortBy: "companyName",
        sortDir: "asc",
      });
      setCustomers(result.rows);
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError
          ? caught.message
          : "Could not load customers. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  function pickCustomer(id: string) {
    const customer = customers.find((row) => row.id === id);
    setValue("customerId", id, { shouldDirty: true });
    setValue("customer", customer ? customerLabel(customer) : "", { shouldDirty: true });
    // The customer ID, not the older CAN account number: it is what the rest of
    // the product quotes a customer by, so it is what a booking should carry.
    setValue("customerAccountNumber", customer?.cid ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
    // The term this customer is billed on, as their record words it ("Net 7").
    // Overwritten on every pick, including back to empty for a customer with no
    // term saved, so the field always answers for the customer now chosen.
    setValue("invoiceTerm", customer?.billing?.term ?? "", {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <FieldShell
      label="Customer"
      required
      hint="Pick a customer to fill their ID and invoice term."
    >
      {error ? (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-xs font-medium text-red-500">{error}</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => void loadCustomers()}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Select value={selectedId ?? ""} onValueChange={pickCustomer} disabled={loading}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading customers…" : "Select a customer"} />
          </SelectTrigger>
          <SelectContent>
            {customers.length === 0 && !loading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No customers found</div>
            ) : (
              customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customerLabel(customer)}
                  {customer.cid ? " (" + customer.cid + ")" : ""}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
      {loading && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading customers
        </span>
      )}
    </FieldShell>
  );
}

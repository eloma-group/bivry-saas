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
 * Picking one pulls their account number straight into the read-only Customer
 * Account Number field beside it, from the customer's own record. Their name is
 * kept on the booking too, and their id, so a save knows exactly who was chosen.
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
    const accountNumber = customer?.accountNumber ?? "";
    setValue("customerId", id, { shouldDirty: true });
    setValue("customer", customer ? customerLabel(customer) : "", { shouldDirty: true });
    setValue("customerAccountNumber", accountNumber, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <FieldShell
      label="Customer"
      required
      hint="Pick a customer to fill their account number."
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
                  {customer.accountNumber ? " (" + customer.accountNumber + ")" : ""}
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

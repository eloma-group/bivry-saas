import { useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import { Building2, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { SectionCard } from "@/components/form/SectionCard";
import { DateField, TextField } from "@/components/form/Fields";
import { Button } from "@/components/ui/button";
import { LogoUpload } from "@/components/customer/LogoUpload";
import { ABN_LENGTH, ACN_LENGTH, rules } from "@/utils/validation";
import { abnStatusLine, gstLine, lookupAbn } from "@/services/abnLookup";
import { ApiRequestError } from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import type { CustomerFormValues } from "@/types/customer";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

/** The fields the Business Register can answer for. All plain strings. */
type RegisterFilled = "companyName" | "legalName" | "acn" | "abnStatus" | "entityType" | "gst";

/**
 * The fields a lookup can leave empty and that are better marked than blank.
 *
 * The register does not hold a website at all, and it lists no trading name for
 * plenty of live businesses. Left empty those read exactly like a lookup that
 * never ran, so they are marked instead: the question was asked and the
 * register had no answer.
 *
 * The ACN is deliberately not on this list. Empty already means something there
 * - the business is not a registered company - and the field takes digits only,
 * so a mark would fail its own validation.
 */
type RegisterBlank = "abnStatus" | "entityType" | "websiteAddress";

/** What goes in a field the register could not answer. */
const NOT_ON_REGISTER = "N/A";

interface CustomerInfoSectionProps {
  /**
   * Whether this section shows the account email.
   *
   * The customer's own form shows it here, read only, because it is one of the
   * details this section is about. The Admin portal renders an editable Login
   * Email of its own in the Account block above, so it turns this one off
   * rather than putting the same field on the page twice.
   */
  showAccountEmail?: boolean;
}

export function CustomerInfoSection({ showAccountEmail = true }: CustomerInfoSectionProps = {}) {
  const { user } = useAuth();
  const { control, getValues, setValue, trigger } = useFormContext<CustomerFormValues>();
  const tradingNames = useFieldArray({ control, name: "tradingNames" });
  const [looking, setLooking] = useState(false);

  /**
   * Fills the section from the Australian Business Register.
   *
   * Everything it writes stays editable. The register holds the registered
   * truth about a company, so a customer who asked for it gets it in full
   * rather than only in the gaps, but the last word is still theirs.
   */
  async function fillFromRegister() {
    const abn = (getValues("abn") ?? "").replace(/\D/g, "");

    // The rule on the field says the same thing, but it has nothing to say
    // until the field has been touched, and this button can be pressed first.
    if (abn.length !== ABN_LENGTH) {
      await trigger("abn");
      toast.error("Enter the ABN first", {
        description: `The register needs all ${ABN_LENGTH} digits before it can find the business.`,
      });
      return;
    }

    setLooking(true);

    try {
      const found = await lookupAbn(abn, user?.role);
      const fill = (field: RegisterFilled, value: string) => {
        if (!value) return;
        setValue(field, value, { shouldDirty: true, shouldValidate: true });
      };

      // Marks a field the register had nothing for, without writing over one
      // the customer has already filled in themselves.
      const markIfEmpty = (field: RegisterBlank) => {
        if ((getValues(field) ?? "").trim()) return;
        setValue(field, NOT_ON_REGISTER, { shouldDirty: true, shouldValidate: true });
      };

      // The entity name is the company's registered name, so it lands in both
      // the account's name and the legal one.
      fill("companyName", found.entityName);
      fill("legalName", found.entityName);
      fill("acn", found.acn);

      // A company can trade under several names and the register lists every
      // one of them. All of them come back, newest first as it orders them, and
      // the customer drops the ones that do not apply.
      if (found.businessNames.length > 0) {
        tradingNames.replace(found.businessNames.map((name) => ({ name })));
      } else if (!(getValues("tradingNames.0.name") ?? "").trim()) {
        // The register lists none for this business. The field is required, so
        // leaving it empty would only fail on submit later.
        tradingNames.replace([{ name: NOT_ON_REGISTER }]);
      }
      fill("abnStatus", abnStatusLine(found));
      fill("entityType", found.entityTypeName);
      fill("gst", gstLine(found));

      // Anything the register could not answer for is marked, so a thin record
      // reads as answered rather than as a lookup that never ran.
      markIfEmpty("abnStatus");
      markIfEmpty("entityType");
      markIfEmpty("websiteAddress");

      toast.success("Filled from the Business Register", {
        description: found.entityName,
      });
    } catch (error) {
      toast.error("Could not look up that ABN", {
        description:
          error instanceof ApiRequestError
            ? error.message
            : "Please check your connection, or enter the details manually.",
      });
    } finally {
      setLooking(false);
    }
  }

  return (
    <SectionCard
      index={1}
      id="step-customer"
      icon={Building2}
      title="Customer Information"
      description="How your business is registered and how we identify it."
    >
      <div className="mb-8 rounded-2xl border border-border/60 bg-secondary/30 p-5">
        <LogoUpload />
      </div>

      <div className={GRID}>
        <TextField
          name="abn"
          label="ABN"
          placeholder="51824753556"
          required
          digitsOnly
          maxLength={ABN_LENGTH}
          rules={rules.abn}
          hint="Eleven digits. Look it up and the register fills in the rest."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8"
              onClick={() => void fillFromRegister()}
              disabled={looking}
            >
              {looking ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" /> Lookup
                </>
              )}
            </Button>
          }
        />
        <TextField
          name="abnStatus"
          label="ABN Status"
          placeholder="Look up the ABN to fill this"
          readOnly
          hint="What the Business Register holds. It cannot be typed in."
        />
        <TextField
          name="entityType"
          label="Entity Type"
          placeholder="Look up the ABN to fill this"
          readOnly
          hint="What the register calls this business. Only a company has an ACN."
        />
        <TextField
          name="gst"
          label="GST"
          placeholder="Look up the ABN to fill this"
          hint="What the register holds. Type over it if you know better."
        />
        <TextField
          name="acn"
          label="ACN"
          placeholder="004085616"
          digitsOnly
          maxLength={ACN_LENGTH}
          rules={rules.acn}
          hint="Nine digits. Leave it empty if the business is not a registered company."
        />
        <TextField
          name="companyName"
          label="Company Name"
          placeholder="Sanket Transport Pty Ltd"
          required
          rules={rules.required("Company name")}
        />

        <AnimatePresence initial={false}>
          {tradingNames.fields.map((row, index) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
            >
              <TextField
                name={`tradingNames.${index}.name`}
                label={
                  tradingNames.fields.length > 1 ? `Trading Name ${index + 1}` : "Trading Name"
                }
                placeholder="Sanket Logistics"
                required={index === 0}
                rules={index === 0 ? rules.required("Trading name") : undefined}
                actionSize="icon"
                // Extra rows only ever arrive from the lookup, so the cross is
                // the one way back out of them. The last one standing keeps no
                // cross, because a business always trades under something.
                action={
                  tradingNames.fields.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => tradingNames.remove(index)}
                      className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                      aria-label={`Remove trading name ${index + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : undefined
                }
              />
            </motion.div>
          ))}
        </AnimatePresence>

        <TextField
          name="legalName"
          label="Legal Name"
          placeholder="Sanket Transport Pty Ltd"
          required
          rules={rules.required("Legal name")}
        />
        <TextField
          name="websiteAddress"
          label="Website Address"
          placeholder="xyz.com"
          hint="The register does not hold this one. Type it in if you have a site."
        />

        {/* No named person and no phone number here: this section is about the
            business. Who we speak to, what they do and how to reach them are
            asked for once, per department, in the Communication section. */}
        {showAccountEmail && (
          <TextField
            name="email"
            label="Email"
            type="email"
            readOnly
            hint="This identifies your account, so it cannot be changed here."
          />
        )}
        <TextField
          name="cid"
          label="Customer ID"
          placeholder="Assigned automatically"
          readOnly
          hint="Assigned by BIVRY (CUST-3000 onwards). It cannot be changed."
        />
        <DateField
          name="creationDate"
          label="Creation Date"
          required
          rules={rules.required("Creation date")}
          hint="Opens on today. Change it if this record is being backdated."
        />
      </div>
    </SectionCard>
  );
}

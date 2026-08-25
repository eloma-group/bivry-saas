import { Building2 } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField } from "@/components/form/Fields";
import { LogoUpload } from "@/components/vendor/LogoUpload";
import { PHONE_MAX, rules } from "@/utils/validation";
import { useAuth } from "@/context/AuthContext";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function SupplierInfoSection({
  emailEditable = false,
}: {
  /**
   * Admins correct addresses that were mistyped at signup, so the Admin portal
   * opens this field. A supplier editing their own profile never can: the email
   * is what identifies the account they are signed in to.
   */
  emailEditable?: boolean;
} = {}) {
  const { user } = useAuth();

  // Without a session (the development auth bypass) there is no account email
  // to lock to, so the field stays open there as well.
  const emailLocked = !emailEditable && Boolean(user?.email);

  return (
    <SectionCard
      index={1}
      id="step-supplier"
      icon={Building2}
      title="Supplier Information"
      description="How your business is registered and how we identify it."
    >
      <div className="mb-8 rounded-2xl border border-border/60 bg-secondary/30 p-5">
        <LogoUpload />
      </div>

      <div className={GRID}>
        <TextField
          name="companyName"
          label="Company Name"
          placeholder="Sanket Transport Pty Ltd"
          required
          rules={rules.required("Company name")}
        />
        <TextField
          name="tradingName"
          label="Trading Name"
          placeholder="Sanket Logistics"
          required
          rules={rules.required("Trading name")}
        />
        <TextField
          name="abn"
          label="ABN"
          placeholder="08548445"
          required
          rules={rules.required("ABN")}
        />
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
          required
          rules={rules.required("Website address")}
        />
        <TextField
          name="supplierId"
          label="Supplier ID"
          placeholder="Assigned automatically"
          readOnly
          hint="Assigned by BIVRY. It cannot be changed."
        />
        <TextField
          name="phone"
          label="Company Phone"
          type="tel"
          placeholder="+61 400000000"
          required
          maxLength={PHONE_MAX}
          rules={rules.phone}
        />
        <TextField
          name="email"
          label="Account Email"
          type="email"
          placeholder="accounts@company.com"
          required
          readOnly={emailLocked}
          hint={
            emailLocked
              ? "Taken from your account and used to identify you. It cannot be changed here."
              : undefined
          }
          rules={rules.email}
          className="sm:col-span-2"
        />
      </div>
    </SectionCard>
  );
}

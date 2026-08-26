import { User } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField, SelectField } from "@/components/form/Fields";
import { AvatarUpload } from "@/components/driver/AvatarUpload";
import { COUNTRIES } from "@/constants/options";
import {
  MIN_AGE,
  NAME_MAX,
  PHONE_MAX,
  latestAdultBirthDate,
  rules,
} from "@/utils/validation";
import { useAuth } from "@/context/AuthContext";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function PersonalInfoSection({
  emailEditable = false,
}: {
  /**
   * Admins correct addresses that were mistyped at signup, so the Admin portal
   * opens this field. A driver editing their own profile never can: the email
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
      id="step-personal"
      icon={User}
      title="Personal Information"
      description="Basic identity details for the driver profile."
    >
      <div className="mb-8 rounded-2xl border border-border/60 bg-secondary/30 p-5">
        <AvatarUpload />
      </div>

      <div className={GRID}>
        <TextField
          name="firstName"
          label="First Name"
          placeholder="Sanket"
          required
          maxLength={NAME_MAX}
          rules={rules.name("First name")}
        />
        <TextField
          name="middleName"
          label="Middle Name"
          placeholder="Raju"
          maxLength={NAME_MAX}
          rules={rules.name("Middle name", false)}
        />
        <TextField
          name="lastName"
          label="Last Name"
          placeholder="Salve"
          required
          maxLength={NAME_MAX}
          rules={rules.name("Last name")}
        />
        <DateField
          name="dob"
          label="Date of Birth"
          required
          hint={`Must be at least ${MIN_AGE} years old.`}
          max={latestAdultBirthDate()}
          rules={rules.dateOfBirth()}
        />
        <SelectField
          name="country"
          label="Country"
          options={COUNTRIES}
          required
          rules={rules.required("Country")}
        />
        <TextField
          name="phone"
          label="Phone Number"
          type="tel"
          placeholder="+61 400000000"
          required
          maxLength={PHONE_MAX}
          rules={rules.phone}
        />
        <TextField
          name="email"
          label="Email"
          type="email"
          placeholder="sanket.r.salve@gmail.com"
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

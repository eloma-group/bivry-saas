import { User } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { TextField, DateField, SelectField } from "@/components/form/Fields";
import { AvatarUpload } from "@/components/driver/AvatarUpload";
import { COUNTRIES } from "@/constants/options";
import { rules } from "@/utils/validation";
import { useAuth } from "@/context/AuthContext";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

export function PersonalInfoSection() {
  const { user } = useAuth();

  // The email is what identifies this driver's account, so it is shown as read
  // only and can never be edited from here. Without a session (the development
  // auth bypass) there is no account email to lock to, so the field stays open.
  const emailLocked = Boolean(user?.email);

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
          rules={rules.required("First name")}
        />
        <TextField name="middleName" label="Middle Name" placeholder="Raju" />
        <TextField
          name="lastName"
          label="Last Name"
          placeholder="Salve"
          required
          rules={rules.required("Last name")}
        />
        <DateField
          name="dob"
          label="Date of Birth"
          required
          max={new Date().toISOString().slice(0, 10)}
          rules={rules.required("Date of birth")}
        />
        <SelectField
          name="nationality"
          label="Nationality"
          options={COUNTRIES}
          required
          rules={rules.required("Nationality")}
        />
        <TextField
          name="phone"
          label="Phone Number"
          type="tel"
          placeholder="+61 9584586482"
          required
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

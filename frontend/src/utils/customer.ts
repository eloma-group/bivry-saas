import type { CustomerContactType } from "@/services/customerService";

/**
 * Presenting a customer. These helpers only decide what to show from what the
 * backend already sends; they never invent a value.
 */

/** Just enough of a customer to work out which number to show for it. */
interface CustomerPhoneSource {
  phone: string | null;
  contacts: Array<{ type: CustomerContactType; contactNumber: string | null }>;
}

/**
 * The phone number to show for a customer.
 *
 * `phone` is the account's own number. The onboarding form does seed and save
 * it, but a record created before that, or by an admin who left it blank,
 * carries null there - which is why a customer who has plainly given a number
 * would otherwise read as having none.
 *
 * What a customer always fills in is a contact number per department, so those
 * answer for the account when it has none of its own. Operations is preferred
 * because it is the block the other three copy; any other block that carries a
 * number is taken after it, so a customer who filled in only dispatch still
 * shows a number rather than nothing.
 */
export function customerPhone(customer: CustomerPhoneSource): string | null {
  const own = customer.phone?.trim();
  if (own) return own;

  const operationsFirst = [
    ...customer.contacts.filter((contact) => contact.type === "OPERATIONS"),
    ...customer.contacts.filter((contact) => contact.type !== "OPERATIONS"),
  ];

  for (const contact of operationsFirst) {
    const number = contact.contactNumber?.trim();
    if (number) return number;
  }

  return null;
}

/** How a customer reads in a list: the company, or the person, or the email. */
export function customerLabel(customer: {
  companyName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const company = customer.companyName?.trim();
  if (company) return company;

  const person = [customer.firstName, customer.lastName].filter(Boolean).join(" ").trim();
  return person || customer.email;
}

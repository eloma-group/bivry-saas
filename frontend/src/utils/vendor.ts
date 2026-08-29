import type { VendorContactType } from "@/services/vendorService";

/**
 * Presenting a vendor. These helpers only decide what to show from what the
 * backend already sends; they never invent a value.
 */

/** Just enough of a vendor to work out which number to show for it. */
interface VendorPhoneSource {
  phone: string | null;
  contacts: Array<{ type: VendorContactType; contactNumber: string | null }>;
}

/**
 * The phone number to show for a vendor.
 *
 * `phone` is the account's own number and is only ever set when the account is
 * created, because the onboarding form has no field for it. A vendor who
 * registered without one therefore carries null there for good, which is why
 * the admin list showed "No phone" against vendors who had plainly given one.
 *
 * What a vendor does fill in is a contact number per department, so those
 * answer for the account when it has none of its own. Operations is preferred
 * because it is the block the other three copy; any other block that carries a
 * number is taken after it, so a vendor who filled in only dispatch still
 * shows a number rather than nothing.
 */
export function vendorPhone(vendor: VendorPhoneSource): string | null {
  const own = vendor.phone?.trim();
  if (own) return own;

  const operationsFirst = [
    ...vendor.contacts.filter((contact) => contact.type === "OPERATIONS"),
    ...vendor.contacts.filter((contact) => contact.type !== "OPERATIONS"),
  ];

  for (const contact of operationsFirst) {
    const number = contact.contactNumber?.trim();
    if (number) return number;
  }

  return null;
}

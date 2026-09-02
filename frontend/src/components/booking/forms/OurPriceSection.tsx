import { Wallet } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { PriceFields } from "./PriceFields";

/**
 * Section 5 - what we charge the customer, in AUD.
 *
 * The gross, fuel levy rate and GST rate are typed; the four amounts follow from
 * them. See PriceFields for the arithmetic. This price is our own and stands
 * apart from the vendor's price further down the form.
 */
export function OurPriceSection() {
  return (
    <SectionCard
      index={5}
      id="step-price"
      icon={Wallet}
      title="Our Price"
      description="What we charge the customer. Amounts are in AUD; the levy, GST and totals work themselves out."
    >
      <PriceFields base="price" />
    </SectionCard>
  );
}

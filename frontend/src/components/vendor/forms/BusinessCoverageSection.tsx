import { Globe2 } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { MultiSelectField } from "@/components/form/Fields";
import { BUSINESS_OPERATIONS, COVERAGE_AREAS } from "@/constants/vendorOptions";
import { rules } from "@/utils/validation";

export function BusinessCoverageSection() {
  return (
    <SectionCard
      index={5}
      id="step-coverage"
      icon={Globe2}
      title="Business Coverage"
      description="Where you run, and what kind of freight you carry."
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <MultiSelectField
          name="areasCovered"
          label="Area Covered"
          options={COVERAGE_AREAS}
          placeholder="Select states and territories"
          required
          rules={rules.requiredList("Area covered")}
        />
        <MultiSelectField
          name="businessOperations"
          label="Business Operations"
          options={BUSINESS_OPERATIONS}
          placeholder="Select operations"
          required
          rules={rules.requiredList("Business operations")}
        />
      </div>
    </SectionCard>
  );
}

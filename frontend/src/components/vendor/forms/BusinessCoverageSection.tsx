import { Globe2 } from "lucide-react";
import { SectionCard } from "@/components/form/SectionCard";
import { MultiSelectField } from "@/components/form/Fields";
import { BUSINESS_OPERATIONS, COVERAGE_AREAS } from "@/constants/vendorOptions";
import { OPTION_LISTS } from "@/constants/optionLists";
import { rules } from "@/utils/validation";

export function BusinessCoverageSection() {
  return (
    <SectionCard
      index={6}
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
          listKey={OPTION_LISTS.coverageArea}
          placeholder="Select states and territories"
          required
          rules={rules.requiredList("Area covered")}
        />
        <MultiSelectField
          name="businessOperations"
          label="Business Operations"
          options={BUSINESS_OPERATIONS}
          listKey={OPTION_LISTS.businessOperation}
          placeholder="Select operations"
          required
          rules={rules.requiredList("Business operations")}
        />
      </div>
    </SectionCard>
  );
}

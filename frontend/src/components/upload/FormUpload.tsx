import { Controller, useFormContext, get } from "react-hook-form";
import { FileUpload } from "./FileUpload";
import { rules as sharedRules } from "@/utils/validation";
import type { FieldRules } from "@/components/form/Fields";

interface FormUploadProps {
  name: string;
  label?: string;
  accept?: string;
  allowCamera?: boolean;
  cameraTitle?: string;
  /** Offer a crop before an image is committed. See FileUpload. */
  allowCrop?: boolean;
  cropTitle?: string;
  rules?: FieldRules;
  className?: string;
  /** Marks the box with a * and refuses an empty submit. */
  required?: boolean;
  /** Compact single row layout, used inside document tables. */
  compact?: boolean;
}

/** Binds the reusable <FileUpload/> to react-hook-form state. */
export function FormUpload({
  name,
  label,
  accept,
  allowCamera,
  cameraTitle,
  allowCrop,
  cropTitle,
  rules,
  className,
  required,
  compact,
}: FormUploadProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <Controller
      control={control}
      name={name}
      rules={rules ?? (required ? sharedRules.requiredFile(label ?? "This file") : undefined)}
      render={({ field }) => (
        <FileUpload
          value={field.value as never}
          onChange={field.onChange}
          label={label}
          accept={accept}
          allowCamera={allowCamera}
          cameraTitle={cameraTitle}
          allowCrop={allowCrop}
          cropTitle={cropTitle}
          error={error}
          required={required}
          compact={compact}
          className={className}
        />
      )}
    />
  );
}

import { Controller, useFormContext, get } from "react-hook-form";
import { FileUpload } from "./FileUpload";
import type { RegisterOptions } from "react-hook-form";
import type { DriverFormValues } from "@/types/driver";

interface FormUploadProps {
  name: string;
  label?: string;
  accept?: string;
  allowCamera?: boolean;
  cameraTitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rules?: RegisterOptions<DriverFormValues, any>;
  className?: string;
}

/** Binds the reusable <FileUpload/> to react-hook-form state. */
export function FormUpload({
  name,
  label,
  accept,
  allowCamera,
  cameraTitle,
  rules,
  className,
}: FormUploadProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<DriverFormValues>();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <Controller
      control={control}
      name={name as keyof DriverFormValues}
      rules={rules}
      render={({ field }) => (
        <FileUpload
          value={field.value as never}
          onChange={field.onChange}
          label={label}
          accept={accept}
          allowCamera={allowCamera}
          cameraTitle={cameraTitle}
          error={error}
          className={className}
        />
      )}
    />
  );
}

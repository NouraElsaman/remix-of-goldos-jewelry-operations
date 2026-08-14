import { format } from "date-fns";
import { CalendarIcon, QrCode } from "lucide-react";
import type { FieldValues } from "react-hook-form";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";
import { ControlledField, type BaseFieldProps } from "./controlled-field";

const invalidRing =
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20";

export function TextField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, onBlur, invalid }) => (
        <Input
          id={id}
          value={(value as string | undefined) ?? ""}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={invalid}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className={cn("h-11 rounded-xl", invalidRing)}
        />
      )}
    />
  );
}

export function PasswordField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, onBlur, invalid }) => (
        <Input
          id={id}
          type="password"
          value={(value as string | undefined) ?? ""}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={invalid}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className={cn("h-11 rounded-xl", invalidRing)}
        />
      )}
    />
  );
}

/**
 * Latin-script fields (email, phone, codes) keep an LTR direction even inside
 * the RTL Arabic shell so the caret and punctuation read correctly.
 */
function LtrInputField<T extends FieldValues>({
  type,
  inputMode,
  mono,
  ...props
}: BaseFieldProps<T> & {
  type?: string | undefined;
  inputMode?: "email" | "tel" | "text" | undefined;
  mono?: boolean | undefined;
}) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, onBlur, invalid }) => (
        <Input
          id={id}
          {...(type ? { type } : {})}
          {...(inputMode ? { inputMode } : {})}
          dir="ltr"
          value={(value as string | undefined) ?? ""}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={invalid}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-11 rounded-xl text-start",
            mono && "font-mono",
            invalidRing,
          )}
        />
      )}
    />
  );
}

export function EmailField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return <LtrInputField {...props} type="email" inputMode="email" />;
}

export function PhoneField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return <LtrInputField {...props} type="tel" inputMode="tel" />;
}

/** Codes, SKUs, tax/registry numbers: LTR + monospaced. */
export function CodeField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return <LtrInputField {...props} inputMode="text" mono />;
}

function NumericField<T extends FieldValues>({
  step,
  suffix,
  ...props
}: BaseFieldProps<T> & { step: string; suffix?: ReactNode }) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, onBlur, invalid }) => (
        <div className="relative">
          <Input
            id={id}
            type="number"
            inputMode="decimal"
            step={step}
            value={value === undefined || value === null ? "" : String(value)}
            placeholder={props.placeholder}
            disabled={props.disabled}
            aria-invalid={invalid}
            onBlur={onBlur}
            onChange={(event) =>
              onChange(
                event.target.value === ""
                  ? undefined
                  : Number(event.target.value),
              )
            }
            data-numeric
            dir="ltr"
            className={cn("h-11 rounded-xl pe-14", invalidRing)}
          />
          {suffix ? (
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-medium text-muted-foreground">
              {suffix}
            </span>
          ) : null}
        </div>
      )}
    />
  );
}

export function NumberField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return <NumericField {...props} step="1" />;
}

export function CurrencyField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return <NumericField {...props} step="0.01" suffix={appConfig.currency} />;
}

export function WeightField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return <NumericField {...props} step="0.001" suffix="g" />;
}

export function QrField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, onBlur, invalid }) => (
        <div className="relative">
          <QrCode
            className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            id={id}
            value={(value as string | undefined) ?? ""}
            placeholder={props.placeholder}
            disabled={props.disabled}
            autoComplete="off"
            aria-invalid={invalid}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            className={cn("h-11 rounded-xl ps-10 font-mono", invalidRing)}
          />
        </div>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({
  options,
  ...props
}: BaseFieldProps<T> & { options: { value: string; label: string }[] }) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, invalid }) => (
        <Select
          value={(value as string | undefined) ?? ""}
          onValueChange={onChange}
          disabled={props.disabled ?? false}
        >
          <SelectTrigger
            id={id}
            aria-invalid={invalid}
            className={cn("!h-11 rounded-xl", invalidRing)}
          >
            <SelectValue placeholder={props.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

export function CheckboxField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return (
    <ControlledField
      {...props}
      label={undefined}
      render={({ id, value, onChange, invalid }) => (
        <label
          htmlFor={id}
          className="flex items-center gap-3 text-sm text-foreground"
        >
          <Checkbox
            id={id}
            checked={Boolean(value)}
            disabled={props.disabled}
            aria-invalid={invalid}
            onCheckedChange={(checked) => onChange(checked === true)}
          />
          {props.label}
        </label>
      )}
    />
  );
}

export function TextareaField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, onBlur, invalid }) => (
        <Textarea
          id={id}
          rows={4}
          value={(value as string | undefined) ?? ""}
          placeholder={props.placeholder}
          disabled={props.disabled}
          aria-invalid={invalid}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          className={cn("rounded-xl", invalidRing)}
        />
      )}
    />
  );
}

export function DateField<T extends FieldValues>(props: BaseFieldProps<T>) {
  return (
    <ControlledField
      {...props}
      render={({ id, value, onChange, invalid }) => {
        const selected = value instanceof Date ? value : undefined;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id={id}
                type="button"
                variant="outline"
                aria-invalid={invalid}
                disabled={props.disabled}
                className={cn(
                  "h-11 w-full justify-start gap-2 rounded-xl font-normal",
                  invalidRing,
                )}
              >
                <CalendarIcon
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
                {selected ? format(selected, "PP") : (props.placeholder ?? "—")}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(date) => onChange(date)}
              />
            </PopoverContent>
          </Popover>
        );
      }}
    />
  );
}

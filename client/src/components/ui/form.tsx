import * as React from "react";
import { useFormContext, Controller, FieldPath, FieldValues } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const Form = ({ ...props }) => <form {...props} />;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: {
  name: TName;
  children: React.ReactNode;
}) => {
  const formContext = useFormContext<TFieldValues>();
  if (!formContext) {
    throw new Error("FormField must be used within a Form");
  }
  
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller
        {...props}
        control={formContext.control}
        render={({ field, fieldState }) => (
          <FormItemContext.Provider value={{ id: field.name, ...field, fieldState }}>
            {props.children}
          </FormItemContext.Provider>
        )}
      />
    </FormFieldContext.Provider>
  );
};

type FormItemContextValue = {
  id: string;
  fieldState?: any;
} & any;

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("space-y-2", className)} {...props} />
  );
});
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext);
  return (
    <Label
      ref={ref}
      className={className}
      htmlFor={id}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ ...props }, ref) => {
  const { id, ...field } = React.useContext(FormItemContext);
  return (
    <div ref={ref} id={id} {...props} {...field} />
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { fieldState } = React.useContext(FormItemContext);
  const { error } = fieldState || {};

  if (!error) {
    return null;
  }

  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {error?.message}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
};
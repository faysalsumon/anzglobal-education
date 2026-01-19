import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { COUNTRIES, getFlagUrl, getCountryByName } from "@/lib/countries";

interface CountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = "Select a country",
  disabled = false,
  className,
  "data-testid": testId,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = getCountryByName(value || "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={testId}
        >
          {selectedCountry ? (
            <span className="flex items-center gap-2">
              <img
                src={getFlagUrl(selectedCountry.code)}
                alt={`${selectedCountry.name} flag`}
                className="w-5 h-auto rounded-sm"
                loading="lazy"
              />
              <span>{selectedCountry.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search country..."
            data-testid={testId ? `${testId}-search` : "input-country-search"}
          />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name}
                  onSelect={() => {
                    onChange?.(country.name);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                  data-testid={testId ? `${testId}-option-${country.code.toLowerCase()}` : `option-country-${country.code.toLowerCase()}`}
                >
                  <img
                    src={getFlagUrl(country.code)}
                    alt={`${country.name} flag`}
                    className="w-5 h-auto rounded-sm"
                    loading="lazy"
                  />
                  <span className="flex-1">{country.name}</span>
                  {selectedCountry?.code === country.code && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

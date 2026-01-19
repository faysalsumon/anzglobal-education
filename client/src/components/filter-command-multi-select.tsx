import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getCountryByName, getFlagUrl } from "@/lib/countries";

interface FilterCommandMultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder?: string;
  testId?: string;
  showCountryFlags?: boolean;
}

export function FilterCommandMultiSelect({
  label,
  options,
  selected,
  onToggle,
  placeholder = "Search...",
  testId,
  showCountryFlags = false,
}: FilterCommandMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const getCountryFlag = (countryName: string) => {
    if (!showCountryFlags) return null;
    const country = getCountryByName(countryName);
    if (!country) return null;
    return (
      <img
        src={getFlagUrl(country.code)}
        alt={`${country.name} flag`}
        className="w-5 h-auto rounded-sm"
        loading="lazy"
      />
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          data-testid={testId}
        >
          <span className="truncate">
            {selected.length > 0
              ? `${label} (${selected.length})`
              : label}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option);
                const flag = getCountryFlag(option);
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => onToggle(option)}
                    data-testid={`${testId}-option-${option}`}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    {flag && <span className="mr-2">{flag}</span>}
                    <span className="flex-1">{option}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

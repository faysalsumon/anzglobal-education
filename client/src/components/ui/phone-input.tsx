import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  COUNTRIES_WITH_DIAL_CODES, 
  getFlagUrl, 
  parsePhoneNumber,
  type CountryWithDialCode 
} from "@/lib/countries";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  className,
  "data-testid": testId,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryWithDialCode | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed.countryCode) {
        const country = COUNTRIES_WITH_DIAL_CODES.find(c => c.code === parsed.countryCode);
        if (country) {
          setSelectedCountry(country);
          setPhoneNumber(parsed.number);
          return;
        }
      }
      if (value.startsWith("+")) {
        setPhoneNumber(value);
      } else {
        setPhoneNumber(value);
      }
    } else {
      setPhoneNumber("");
    }
  }, [value]);

  const handleCountrySelect = (country: CountryWithDialCode) => {
    setSelectedCountry(country);
    setOpen(false);
    const newValue = phoneNumber ? `${country.dialCode}${phoneNumber}` : "";
    onChange(newValue);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/[^\d]/g, "");
    setPhoneNumber(newNumber);
    if (selectedCountry && newNumber) {
      onChange(`${selectedCountry.dialCode}${newNumber}`);
    } else if (newNumber) {
      onChange(newNumber);
    } else {
      onChange("");
    }
  };

  return (
    <div className={cn("flex gap-1", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-[100px] justify-between px-2 shrink-0"
            data-testid={testId ? `${testId}-country` : undefined}
          >
            {selectedCountry ? (
              <span className="flex items-center gap-1.5 truncate">
                <img
                  src={getFlagUrl(selectedCountry.code)}
                  alt={selectedCountry.name}
                  className="w-5 h-4 object-cover rounded-sm shrink-0"
                />
                <span className="text-sm">{selectedCountry.dialCode}</span>
              </span>
            ) : (
              <span className="text-muted-foreground text-sm">Code</span>
            )}
            <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup className="max-h-[300px] overflow-auto">
                {COUNTRIES_WITH_DIAL_CODES.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.dialCode}`}
                    onSelect={() => handleCountrySelect(country)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry?.code === country.code
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <img
                      src={getFlagUrl(country.code)}
                      alt={country.name}
                      className="w-5 h-4 object-cover rounded-sm mr-2"
                    />
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="text-muted-foreground ml-2">
                      {country.dialCode}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
        data-testid={testId}
      />
    </div>
  );
}

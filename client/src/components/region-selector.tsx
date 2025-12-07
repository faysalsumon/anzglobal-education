import { useRegion } from "@/context/RegionContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RegionSelectorProps {
  variant?: "dropdown" | "select" | "compact";
  showPathway?: boolean;
  showLocale?: boolean;
  className?: string;
}

export function RegionSelector({ 
  variant = "dropdown", 
  showPathway = false,
  showLocale = false,
  className = "" 
}: RegionSelectorProps) {
  const { 
    region, 
    pathway,
    locale,
    availableRegions, 
    availablePathways,
    setRegion, 
    setPathway,
    setLocale,
    isLoading,
    detectedFromDomain,
  } = useRegion();

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className={className} data-testid="region-selector-loading">
        <Globe className="h-4 w-4 mr-2" />
        Loading...
      </Button>
    );
  }

  if (variant === "compact") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className={className} data-testid="region-selector-compact">
            {region?.flagEmoji && <span className="mr-1">{region.flagEmoji}</span>}
            <span className="font-medium">{region?.code || "AU"}</span>
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-testid="region-dropdown-content">
          <DropdownMenuLabel>Select Region</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {availableRegions.map((r) => (
            <DropdownMenuItem 
              key={r.code}
              onClick={() => setRegion(r.code)}
              className={region?.code === r.code ? "bg-accent" : ""}
              data-testid={`region-option-${r.code}`}
            >
              {r.flagEmoji && <span className="mr-2">{r.flagEmoji}</span>}
              <span>{r.name}</span>
              {detectedFromDomain && region?.code === r.code && (
                <span className="ml-2 text-xs text-muted-foreground">(detected)</span>
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === "select") {
    return (
      <div className={`flex items-center gap-2 ${className}`} data-testid="region-selector-full">
        <Select value={region?.code || ""} onValueChange={setRegion}>
          <SelectTrigger className="w-[180px]" data-testid="region-select-trigger">
            <Globe className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent data-testid="region-select-content">
            {availableRegions.map((r) => (
              <SelectItem key={r.code} value={r.code} data-testid={`region-select-${r.code}`}>
                {r.flagEmoji && <span className="mr-2">{r.flagEmoji}</span>}
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showPathway && availablePathways.length > 0 && (
          <Select 
            value={pathway?.code || ""} 
            onValueChange={(val) => setPathway(val || null)}
          >
            <SelectTrigger className="w-[150px]" data-testid="pathway-select-trigger">
              <SelectValue placeholder="Pathway" />
            </SelectTrigger>
            <SelectContent data-testid="pathway-select-content">
              <SelectItem value="" data-testid="pathway-select-none">Any pathway</SelectItem>
              {availablePathways.map((p) => (
                <SelectItem key={p.code} value={p.code} data-testid={`pathway-select-${p.code}`}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {showLocale && (
          <Select value={locale} onValueChange={setLocale}>
            <SelectTrigger className="w-[100px]" data-testid="locale-select-trigger">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent data-testid="locale-select-content">
              <SelectItem value="en" data-testid="locale-select-en">English</SelectItem>
              <SelectItem value="bn" data-testid="locale-select-bn">বাংলা</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={className} data-testid="region-selector-dropdown">
          <Globe className="h-4 w-4 mr-2" />
          {region?.flagEmoji && <span className="mr-1">{region.flagEmoji}</span>}
          <span>{region?.name || "Select Region"}</span>
          <ChevronDown className="h-3 w-3 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-testid="region-dropdown-content">
        <DropdownMenuLabel>Region & Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availableRegions.map((r) => (
          <DropdownMenuItem 
            key={r.code}
            onClick={() => setRegion(r.code)}
            className={region?.code === r.code ? "bg-accent" : ""}
            data-testid={`region-option-${r.code}`}
          >
            {r.flagEmoji && <span className="mr-2">{r.flagEmoji}</span>}
            <span className="flex-1">{r.name}</span>
            <span className="text-xs text-muted-foreground">{r.defaultCurrency}</span>
          </DropdownMenuItem>
        ))}

        {showPathway && availablePathways.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Student Pathway</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => setPathway(null)}
              className={!pathway ? "bg-accent" : ""}
              data-testid="pathway-option-none"
            >
              Any pathway
            </DropdownMenuItem>
            {availablePathways.map((p) => (
              <DropdownMenuItem 
                key={p.code}
                onClick={() => setPathway(p.code)}
                className={pathway?.code === p.code ? "bg-accent" : ""}
                data-testid={`pathway-option-${p.code}`}
              >
                <span className="flex-1">{p.name}</span>
                {p.requiresVisa && (
                  <span className="text-xs text-muted-foreground">Visa req.</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {showLocale && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Language</DropdownMenuLabel>
            <DropdownMenuItem 
              onClick={() => setLocale("en")}
              className={locale === "en" ? "bg-accent" : ""}
              data-testid="locale-option-en"
            >
              English
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => setLocale("bn")}
              className={locale === "bn" ? "bg-accent" : ""}
              data-testid="locale-option-bn"
            >
              বাংলা (Bengali)
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CurrencyDisplay({ amount, className = "" }: { amount: number | string | null; className?: string }) {
  const { formatCurrency } = useRegion();
  return <span className={className} data-testid="currency-display">{formatCurrency(amount)}</span>;
}

export function RegionBadge({ className = "" }: { className?: string }) {
  const { region, detectedFromDomain } = useRegion();
  
  if (!region) return null;
  
  return (
    <div className={`inline-flex items-center gap-1 text-sm ${className}`} data-testid="region-badge">
      {region.flagEmoji && <span>{region.flagEmoji}</span>}
      <span className="font-medium">{region.code}</span>
      {detectedFromDomain && (
        <span className="text-xs text-muted-foreground">(detected)</span>
      )}
    </div>
  );
}

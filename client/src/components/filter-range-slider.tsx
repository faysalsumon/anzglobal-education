import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface FilterRangeSliderProps {
  label: string;
  min: number;
  max: number;
  value?: [number, number];
  onChange: (min?: number, max?: number) => void;
  formatValue?: (value: number) => string;
  step?: number;
  testId?: string;
}

export function FilterRangeSlider({
  label,
  min,
  max,
  value,
  onChange,
  formatValue = (v) => String(v),
  step = 1,
  testId,
}: FilterRangeSliderProps) {
  const [localValue, setLocalValue] = useState<[number, number]>(
    value || [min, max]
  );

  useEffect(() => {
    setLocalValue(value || [min, max]);
  }, [value, min, max]);

  const handleValueChange = (newValue: number[]) => {
    setLocalValue([newValue[0], newValue[1]]);
  };

  const handleValueCommit = (newValue: number[]) => {
    const [newMin, newMax] = newValue;
    // Only send to parent if values differ from defaults
    if (newMin !== min || newMax !== max) {
      onChange(newMin, newMax);
    } else {
      onChange(undefined, undefined);
    }
  };

  return (
    <div className="space-y-3" data-testid={testId}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{label}</Label>
        <span className="text-xs text-muted-foreground">
          {formatValue(localValue[0])} - {formatValue(localValue[1])}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={localValue}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        className="w-full"
        data-testid={`${testId}-slider`}
      />
    </div>
  );
}

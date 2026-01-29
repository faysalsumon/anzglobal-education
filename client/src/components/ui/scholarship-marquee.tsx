import { Award, DollarSign } from "lucide-react";

type ScholarshipItem = {
  name: string;
  valueType: string;
  value: number;
};

interface ScholarshipMarqueeProps {
  scholarships: ScholarshipItem[];
  className?: string;
  testId?: string;
}

function formatScholarshipValue(scholarship: ScholarshipItem): string {
  if (scholarship.valueType === 'percentage') {
    return `${scholarship.value}% Off`;
  } else {
    return `$${scholarship.value.toLocaleString()} AUD`;
  }
}

export function ScholarshipMarquee({ scholarships, className = "", testId }: ScholarshipMarqueeProps) {
  if (!scholarships || scholarships.length === 0) {
    return null;
  }

  const items = scholarships.map((s, i) => (
    <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap px-3">
      {s.valueType === 'percentage' ? (
        <Award className="h-3.5 w-3.5 flex-shrink-0" />
      ) : (
        <DollarSign className="h-3.5 w-3.5 flex-shrink-0" />
      )}
      <span className="font-bold">{s.name}</span>
      <span className="opacity-70">-</span>
      <span className="font-bold">{formatScholarshipValue(s)}</span>
    </span>
  ));

  return (
    <div 
      className={`relative overflow-hidden text-primary font-bold text-xs py-1.5 max-w-[50%] ${className}`}
      data-testid={testId}
    >
      <div className="scholarship-marquee-container flex">
        <div className="scholarship-marquee-content flex animate-marquee hover:pause-animation">
          {items}
          {items}
        </div>
      </div>
    </div>
  );
}

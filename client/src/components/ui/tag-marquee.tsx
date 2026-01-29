import { Badge } from "@/components/ui/badge";

type TagItem = {
  id: number;
  name: string;
  slug: string;
  color: string | null;
};

interface TagMarqueeProps {
  level: string;
  subject?: string;
  tags?: TagItem[];
  className?: string;
  testId?: string;
}

function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TagMarquee({ level, subject, tags = [], className = "", testId }: TagMarqueeProps) {
  const allItems: { key: string; name: string; color: string | null; type: 'level' | 'subject' | 'tag' }[] = [];
  
  if (level) {
    allItems.push({ key: 'level', name: level, color: null, type: 'level' });
  }
  
  if (subject) {
    allItems.push({ key: 'subject', name: subject, color: null, type: 'subject' });
  }
  
  tags.forEach(tag => {
    allItems.push({ key: `tag-${tag.id}`, name: tag.name, color: tag.color, type: 'tag' });
  });

  if (allItems.length === 0) {
    return null;
  }

  const renderItem = (item: typeof allItems[0], idx: number) => {
    if (item.type === 'level') {
      return (
        <Badge 
          key={`${item.key}-${idx}`}
          className="bg-primary/10 text-primary text-xs whitespace-nowrap flex-shrink-0 mx-1"
          data-testid={testId ? `${testId}-level` : undefined}
        >
          {item.name}
        </Badge>
      );
    }
    
    if (item.type === 'subject') {
      return (
        <Badge 
          key={`${item.key}-${idx}`}
          variant="outline"
          className="text-xs whitespace-nowrap flex-shrink-0 mx-1"
          data-testid={testId ? `${testId}-subject` : undefined}
        >
          {item.name}
        </Badge>
      );
    }
    
    return (
      <Badge 
        key={`${item.key}-${idx}`}
        variant="secondary"
        className="text-xs whitespace-nowrap flex-shrink-0 mx-1"
        style={item.color ? { 
          backgroundColor: hexToRgba(item.color, 0.15), 
          color: item.color, 
          borderColor: hexToRgba(item.color, 0.3) 
        } : undefined}
        data-testid={testId ? `${testId}-tag-${item.key}` : undefined}
      >
        {item.name}
      </Badge>
    );
  };

  const items = allItems.map((item, idx) => renderItem(item, idx));

  return (
    <div 
      className={`relative overflow-hidden py-1 tag-marquee-container max-w-[50%] ${className}`}
      data-testid={testId}
    >
      <div className="flex">
        <div className="tag-marquee-content flex items-center animate-tag-marquee">
          {items}
          {items}
        </div>
      </div>
    </div>
  );
}

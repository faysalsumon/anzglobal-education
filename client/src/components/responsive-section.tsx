import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ResponsiveSectionProps {
  id: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  defaultOpen?: boolean;
  testId?: string;
}

export function ResponsiveSection({
  id,
  icon,
  title,
  children,
  className,
  defaultOpen = true,
  testId,
}: ResponsiveSectionProps) {
  const [accordionValue, setAccordionValue] = useState<string | undefined>(
    defaultOpen ? id : undefined
  );

  return (
    <>
      {/* Desktop: Card view */}
      <Card
        id={id}
        className={cn(
          "hidden md:block border-primary/10",
          className
        )}
        data-testid={testId}
      >
        <CardHeader className="bg-gradient-to-r from-background to-primary/5 border-b">
          <CardTitle className="flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">{children}</CardContent>
      </Card>

      {/* Mobile: Accordion view */}
      <div id={`${id}-mobile`} className="md:hidden p-1" data-testid={testId ? `${testId}-mobile` : undefined}>
        <Accordion
          type="single"
          collapsible
          value={accordionValue}
          onValueChange={setAccordionValue}
          className="border border-primary/10 rounded-lg"
        >
          <AccordionItem value={id} className="border-none">
            <div className="bg-gradient-to-r from-background to-primary/5 rounded-t-lg">
              <AccordionTrigger data-testid={`accordion-trigger-${id}`}>
                <span className="flex items-center gap-2 font-semibold px-4">
                  {icon}
                  {title}
                </span>
              </AccordionTrigger>
            </div>
            <AccordionContent>
              <div className="px-4 pt-2 pb-4">{children}</div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}

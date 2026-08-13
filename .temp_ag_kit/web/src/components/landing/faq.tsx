"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useI18n } from "@/i18n/provider";

export function LandingFAQ() {
  const { t } = useI18n();
  const copy = t.landing.faq;

  return (
    <section
      id="faq"
      className="container mx-auto max-w-[720px] px-4 py-20 sm:px-6 sm:py-28 lg:px-8"
    >
      <div className="mb-8 text-center">
        <p className="mb-2 text-lg tracking-wider text-brand">{copy.eyebrow}</p>
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          {copy.title}
        </h2>
      </div>

      <Accordion>
        {copy.items.map(({ value, question, answer }) => (
          <AccordionItem key={value} value={value}>
            <AccordionTrigger className="text-left text-base">
              {question}
            </AccordionTrigger>
            <AccordionContent className="text-base">{answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

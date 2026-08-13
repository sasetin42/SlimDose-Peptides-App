"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const AVATARS = [
  "https://api.dicebear.com/9.x/avataaars/svg?seed=SarahChen",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=MarcusRodriguez",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=EmilyWatson",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=DavidKim",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=RachelFoster",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=JamesMitchell",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=NinaPatel",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=AlexThompson",
  "https://api.dicebear.com/9.x/avataaars/svg?seed=HenryGarcia",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

export function LandingTestimonials() {
  const { t } = useI18n();
  const copy = t.landing.testimonials;
  const reviews = copy.items.map((item, i) => ({
    ...item,
    avatar: AVATARS[i],
  }));

  return (
    <section id="testimonials" className="w-full py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-center text-3xl font-semibold lg:text-5xl">
            {copy.title}
          </h2>
          <p className="max-w-2xl text-center text-muted-foreground lg:text-xl">
            {copy.subtitle}
          </p>
        </div>

        <div className="relative mt-14 w-full after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-2 after:z-10 after:h-96 after:bg-linear-to-t after:from-background after:to-transparent">
          <div
            className="columns-1 gap-5 md:columns-2 lg:columns-3"
            style={{ columnGap: 20 }}
          >
            {reviews.map((review) => (
              <div
                key={review.name}
                className={cn("mb-5 break-inside-avoid", review.className)}
              >
                <div
                  data-slot="card"
                  className="flex flex-col gap-6 overflow-hidden rounded-xl bg-card p-5 text-sm text-card-foreground shadow-xs ring-1 ring-foreground/10"
                >
                  <div className="flex gap-4 leading-5">
                    <Avatar className="size-10 rounded-full ring-1 ring-input">
                      <AvatarImage
                        src={review.avatar}
                        alt={review.name}
                        className="aspect-square size-full rounded-full object-cover"
                      />
                      <AvatarFallback className="rounded-full bg-muted font-medium">
                        {initials(review.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="mb-2 text-sm">
                      <p className="font-semibold text-foreground">
                        {review.name}
                      </p>
                      <p className="text-muted-foreground">{review.role}</p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "leading-7 text-foreground/60",
                      review.clamp,
                    )}
                  >
                    <q>{review.comment}</q>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

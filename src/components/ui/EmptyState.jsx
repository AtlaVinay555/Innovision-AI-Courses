import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * Reusable empty state component to display when no content is available.
 * @param {Object} props
 * @param {string} props.title - Main heading
 * @param {string} props.description - Detailed explanation
 * @param {LucideIcon} props.icon - Icon component from lucide-react
 * @param {string} [props.actionLabel] - Label for the CTA button
 * @param {string} [props.actionHref] - Href for the CTA button
 * @param {Function} [props.onAction] - Click handler for the CTA button (if no href)
 */
const EmptyState = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  actionHref,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-4 rounded-full bg-muted/50 mb-6 ring-8 ring-muted/20">
        {Icon && <Icon className="h-10 w-10 text-muted-foreground/60" />}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-sm mb-8">
        {description}
      </p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Link href={actionHref}>
              <Button className="rounded-full px-8 shadow-lg shadow-primary/20">
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button
              onClick={onAction}
              className="rounded-full px-8 shadow-lg shadow-primary/20"
            >
              {actionLabel}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default EmptyState;

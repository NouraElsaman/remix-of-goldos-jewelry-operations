import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Page navigation for tables and lists. */
export function PaginationBar({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string | undefined;
}) {
  const { t, isRTL } = useI18n();
  const Prev = ChevronLeft;
  const Next = ChevronRight;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-2 py-1",
        className,
      )}
    >
      <p data-numeric className="text-xs font-medium text-muted-foreground/80">
        {t("common.page")}{" "}
        <span className="font-semibold text-foreground">{page}</span>{" "}
        {t("common.of")}{" "}
        <span className="font-semibold text-foreground">
          {Math.max(pageCount, 1)}
        </span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 rounded-lg px-3 text-xs"
        >
          <Prev className="size-3.5" aria-hidden />
          {t("common.previous")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
          className="h-8 rounded-lg px-3 text-xs"
        >
          {t("common.next")}
          <Next className="size-3.5" aria-hidden />
        </Button>
      </div>
    </div>
  );
}

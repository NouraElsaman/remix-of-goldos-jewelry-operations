import { useMemo } from "react";

import { DataTable, SectionCard, TableContainer } from "@/components/shared";
import { PriceChangeIndicator, PriceSourceBadge } from "@/components/shared";
import type { DataTableColumn } from "@/components/shared";
import {
  groupPricesByDate,
  getPriceDirection,
  formatChangePct,
  SUPPORTED_KARATS,
} from "@/features/pricing/pricing-engine";
import type { PriceHistoryRow } from "@/features/pricing/pricing-engine";
import type { GoldPrice } from "@/types/domain";
import type { Locale, TranslationKey } from "@/lib/i18n";
import { formatMoney, formatDate, formatTime } from "@/lib/format";

/**
 * Historical price table.
 * Groups flat GoldPrice[] by date → one row per day with all karats as columns.
 * Memoized columns; grouping computed once per data change.
 * Supports pagination via parent's page/pageSize state.
 */
export function PriceHistoryTable({
  prices,
  isLoading,
  t,
  locale,
}: {
  prices: GoldPrice[];
  isLoading: boolean;
  t: (key: TranslationKey) => string;
  locale: Locale;
}) {
  const rows = useMemo(() => groupPricesByDate(prices), [prices]);

  const columns = useMemo<DataTableColumn<PriceHistoryRow>[]>(
    () => [
      {
        id: "date",
        header: t("table.status")
          .replace("الحالة", "التاريخ")
          .replace("Status", "Date"),
        width: "9rem",
        cell: (row) => (
          <time className="font-medium text-foreground flex flex-col gap-0.5 text-xs">
            <span>{formatDate(row.date, locale)}</span>
            {row.date.includes("T") && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {formatTime(row.date, locale)}
              </span>
            )}
          </time>
        ),
      },
      // One column per karat
      ...SUPPORTED_KARATS.map((karat) => ({
        id: `k${karat}`,
        header: `${karat}K`,
        numeric: true,
        cell: (row: PriceHistoryRow) => {
          const rate = row.rates[karat];
          const changePct = row.changePcts[karat];
          if (rate == null)
            return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-col items-end gap-0.5">
              <span
                data-numeric
                className="text-sm font-semibold text-foreground"
              >
                {formatMoney(rate, locale)}
              </span>
              {changePct !== undefined ? (
                <PriceChangeIndicator
                  changePct={formatChangePct(changePct)}
                  direction={getPriceDirection(changePct)}
                  className="text-xs"
                />
              ) : null}
            </div>
          );
        },
      })),
      {
        id: "source",
        header: t("table.status")
          .replace("الحالة", "المصدر")
          .replace("Status", "Source"),
        cell: (row) =>
          row.source ? (
            <PriceSourceBadge
              source={row.source as import("@/types/domain").PriceSource}
              locale={locale}
            />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
    ],
    [t, locale],
  );

  return (
    <SectionCard title={t("goldPrices.history")} padded={false}>
      <TableContainer>
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(row) => row.date}
          isLoading={isLoading}
          emptyTitle={t("common.empty")}
          emptyDescription={t("common.placeholderNote")}
        />
      </TableContainer>
    </SectionCard>
  );
}

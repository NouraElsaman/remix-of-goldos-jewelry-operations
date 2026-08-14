import { AlertCard, SectionCard } from "@/components/shared";
import type { DashboardAlert } from "@/services/contracts";
import type { TranslationKey } from "@/lib/i18n";
import { formatTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n";
import { useNavigate } from "@tanstack/react-router";

// Severity sort order (critical first)
const severityOrder = {
  critical: 0,
  error: 1,
  warning: 2,
  info: 3,
  success: 4,
} as const;

/**
 * Alerts section — sorted by severity, then time.
 * Routes action buttons to the relevant pages.
 * Receives pre-fetched alerts from the route — no service calls.
 */
export function AlertsSection({
  alerts,
  isLoading,
  t,
  locale,
}: {
  alerts: DashboardAlert[];
  isLoading: boolean;
  t: (key: TranslationKey) => string;
  locale: Locale;
}) {
  const navigate = useNavigate();

  const sorted = [...alerts].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return (
    <SectionCard title={t("dashboard.alerts")}>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-surface-muted"
            />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          {t("common.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((alert) => (
            <AlertCard
              key={alert.id}
              severity={alert.severity}
              title={alert.title}
              description={alert.description}
              time={formatTime(alert.at, locale)}
              actionLabel={alert.actionLabel}
              onAction={
                alert.actionLabel
                  ? () => {
                      // Map alert action labels to routes
                      if (
                        alert.actionLabel?.includes("مطابقة") ||
                        alert.actionLabel?.includes("Reconcil")
                      ) {
                        void navigate({ to: "/reconciliation" });
                      } else if (
                        alert.actionLabel?.includes("مخزون") ||
                        alert.actionLabel?.includes("Inventory")
                      ) {
                        void navigate({ to: "/inventory" });
                      }
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

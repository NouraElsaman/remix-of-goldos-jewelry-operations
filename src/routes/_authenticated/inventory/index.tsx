import { getCurrentRole } from "@/lib/auth";
import { canAccessRoute, canEdit } from "@/lib/rbac";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DataTable,
  PageHeader,
  PaginationBar,
  PlaceholderBlock,
  SearchInput,
  StatusBadge,
  TableContainer,
  type DataTableColumn,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatWeight, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { PageTransition } from "@/lib/motion";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { queryKeys, services } from "@/services";
import { supabase } from "@/services/supabase/supabase-provider";
import type { InventoryItem } from "@/types/domain";

export const Route = createFileRoute("/_authenticated/inventory/")({
  beforeLoad: () => {
    const role = getCurrentRole();
    if (!canAccessRoute(role, "/inventory")) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "المخزون — جوهرة تك" },
      {
        name: "description",
        content: "تتبع حركات مخزون الذهب والمجوهرات والأدراج.",
      },
      { property: "og:title", content: "المخزون — جوهرة تك" },
      {
        property: "og:description",
        content:
          "Track jewelry items, trays and stock movements across every karat.",
      },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const { t, locale } = useI18n();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Debounce search input to avoid firing a new query on every keystroke.
  const debouncedSearch = useDebouncedValue(search, 350);

  // Reset to page 1 whenever the search term changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Query today's prices to estimate scrap vault value
  const { data: todayPrices = [] } = useQuery({
    queryKey: queryKeys.goldPrices.today(),
    queryFn: () => services.goldPrices.today(),
  });

  const rate24KBuy = todayPrices.find((p) => p.karat === 24)?.rateBuy || 3880;

  // Query retail items list from database
  const { data: retailData, isLoading } = useQuery({
    queryKey: queryKeys.inventory.list({
      page,
      pageSize: 10,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    queryFn: () =>
      services.inventory.list({
        page,
        pageSize: 10,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      }),
  });

  const queryClient = useQueryClient();

  const paginatedItems = useMemo(() => retailData?.items ?? [], [retailData]);
  const totalItems = retailData?.total ?? 0;

  // ── Add Item Form States ──────────────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [skuInput, setSkuInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [karatInput, setKaratInput] = useState<number>(21);
  const [grossWeightInput, setGrossWeightInput] = useState("");
  const [mfgCostInput, setMfgCostInput] = useState("");

  // Mutation to add item directly to database
  const createItemMutation = useMutation({
    mutationFn: (input: Omit<InventoryItem, "id" | "barcode" | "status">) =>
      services.inventory.createItem(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(locale === "ar" ? "تم إضافة القطعة للمخزون بنجاح" : "Item successfully added to inventory");
      setIsAddModalOpen(false);
      
      // reset
      setNameInput("");
      setSkuInput("");
      setCompanyInput("");
      setGrossWeightInput("");
      setMfgCostInput("");
    },
    onError: (err) => {
      console.error(err);
      toast.error(locale === "ar" ? "فشل إضافة القطعة للمخزون" : "Failed to add item to inventory");
    }
  });

  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseFloat(grossWeightInput);
    const mfg = parseFloat(mfgCostInput) || 0;

    if (!nameInput || !skuInput || isNaN(gross)) {
      toast.error(locale === "ar" ? "يرجى ملء الحقول الإلزامية" : "Please fill in all required fields");
      return;
    }

    createItemMutation.mutate({
      sku: skuInput,
      name: nameInput,
      company: companyInput || null,
      category: karatInput === 24 ? "Bars" : "Jewelry",
      karat: karatInput as any,
      grossWeight: gross,
      stoneWeight: 0,
      netWeight: gross,
      manufacturingCost: mfg,
      trayId: null,
    });
  };

  // Query scrap stash weights from database purchase records
  const { data: scrapStash = [], isLoading: isLoadingScrap } = useQuery({
    queryKey: ["scrap-stash"],
    queryFn: async () => {
      const { data: dbData, error } = await supabase
        .from("invoices")
        .select("total_weight, net_weight, karat")
        .eq("transaction_type", "purchase");

      if (error) throw error;

      const karats = [18, 21, 24];
      return karats.map((k) => {
        const items = (dbData || []).filter((item) => Math.round(Number(item.karat)) === k);
        const grossWeight = items.reduce((sum, item) => sum + Number(item.total_weight || 0), 0);
        const netWeight = items.reduce((sum, item) => sum + Number(item.net_weight || 0), 0);
        
        const buyRateForKarat = rate24KBuy * (k / 24);
        const estimatedValue = netWeight * buyRateForKarat;

        return {
          id: String(k),
          karat: `${k}K`,
          grossWeight,
          netWeight,
          count: items.length,
          value: estimatedValue,
        };
      });
    },
    enabled: !!todayPrices.length,
  });

  // Columns for retail inventory
  const columns = useMemo<DataTableColumn<InventoryItem>[]>(
    () => [
      {
        id: "sku",
        header: t("table.sku"),
        cell: (row) => <span className="font-mono text-xs">{row.sku}</span>,
      },
      { id: "name", header: t("table.item"), cell: (row) => row.name },
      {
        id: "company",
        header: locale === "ar" ? "الشركة" : "Company",
        cell: (row) => row.company || "-",
      },
      {
        id: "karat",
        header: t("table.karat"),
        cell: (row) => `${row.karat}K`,
        numeric: true,
      },
      {
        id: "weight",
        header: t("table.weight"),
        cell: (row) => formatWeight(row.netWeight, locale),
        numeric: true,
      },
      {
        id: "status",
        header: t("table.status"),
        cell: (row) => (
          <StatusBadge tone={row.status === "in_stock" ? "success" : "gold"}>
            {row.status === "in_stock"
              ? t("status.inStock")
              : (locale === "ar" ? "مباع" : "Sold")}
          </StatusBadge>
        ),
      },
    ],
    [t, locale],
  );

  // Columns for live scrap gold vault
  const scrapColumns = useMemo<DataTableColumn<any>[]>(
    () => [
      {
        id: "karat",
        header: t("table.karat"),
        cell: (row) => <span className="font-semibold text-foreground">{row.karat}</span>,
      },
      {
        id: "grossWeight",
        header: locale === "ar" ? "الوزن الإجمالي المشتري (جم)" : "Gross Weight Purchased (g)",
        cell: (row) => formatWeight(row.grossWeight, locale),
        numeric: true,
      },
      {
        id: "netWeight",
        header: locale === "ar" ? "الوزن الصافي المستلم (جم)" : "Net Weight Received (g)",
        cell: (row) => (
          <span className="text-emerald-600 font-semibold">
            {formatWeight(row.netWeight, locale)}
          </span>
        ),
        numeric: true,
      },
      {
        id: "count",
        header: locale === "ar" ? "عدد العمليات" : "Transactions Count",
        cell: (row) => `${row.count} ${locale === "ar" ? "عمليات" : "records"}`,
        numeric: true,
      },
      {
        id: "value",
        header: locale === "ar" ? "القيمة التقديرية الحالية (ج.م)" : "Est. Spot Value (EGP)",
        cell: (row) => (
          <span className="font-mono font-bold text-foreground">
            {formatMoney(row.value, locale)}
          </span>
        ),
        numeric: true,
      },
    ],
    [t, locale],
  );

  return (
    <PageTransition>
      <PageHeader
        title={t("inventory.title")}
        description={t("inventory.subtitle")}
        actions={
          canEdit(getCurrentRole(), "/inventory") && (
            <Button onClick={() => setIsAddModalOpen(true)} className="h-10 gap-2 rounded-xl">
              <Plus className="size-4" aria-hidden />
              {t("inventory.addItem")}
            </Button>
          )
        }
      />

      <Tabs defaultValue="finished" className="gap-6">
        <TabsList className="rounded-xl bg-surface-muted/50 p-1 mb-2 border border-border/40">
          <TabsTrigger value="finished" className="rounded-lg px-4 py-2">
            {locale === "ar" ? "المصوغات والمجوهرات الجاهزة" : "Finished Jewelry (Retail)"}
          </TabsTrigger>
          <TabsTrigger value="scrap" className="rounded-lg px-4 py-2">
            {locale === "ar" ? "مخزن الذهب الكسر (المشتريات)" : "Scrap Gold Stash (Vault)"}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Finished Jewelry ── */}
        <TabsContent value="finished" className="space-y-4">
          <TableContainer
            toolbar={
              <SearchInput
                value={search}
                onValueChange={setSearch}
                placeholder={t("common.search")}
                className="max-w-xs"
              />
            }
            footer={
              <PaginationBar
                page={page}
                pageCount={Math.max(
                  1,
                  Math.ceil(totalItems / 10),
                )}
                onPageChange={setPage}
              />
            }
          >
            <DataTable
              columns={columns}
              rows={paginatedItems}
              isLoading={isLoading}
              getRowId={(row) => row.id}
              emptyTitle={t("common.empty")}
              emptyDescription={t("common.placeholderNote")}
            />
          </TableContainer>
        </TabsContent>

        {/* ── Tab 2: Scrap Gold Stash ── */}
        <TabsContent value="scrap" className="space-y-4">
          <TableContainer>
            <DataTable
              columns={scrapColumns}
              rows={scrapStash}
              isLoading={isLoadingScrap}
              getRowId={(row) => row.id}
              emptyTitle={t("common.empty")}
              emptyDescription={locale === "ar" ? "لا توجد حركات شراء للذهب الكسر حالياً" : "No scrap gold buybacks recorded yet"}
            />
          </TableContainer>
        </TabsContent>
      </Tabs>

      {/* ────────────────── ADD ITEM MODAL ────────────────── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border shadow-raised rounded-3xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-foreground">
                {locale === "ar" ? "إضافة قطعة جديدة للمخزون" : "Add New Inventory Item"}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
            </div>

            <form onSubmit={handleAddItemSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="i-name">{locale === "ar" ? "اسم القطعة (الوصف)" : "Item Name / Description"}</Label>
                <Input
                  id="i-name"
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={locale === "ar" ? "خاتم ذهب عيار 21" : "e.g. Gold Ring 21K"}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="i-company">{locale === "ar" ? "اسم الشركة المصنعة" : "Company Name"}</Label>
                <Input
                  id="i-company"
                  type="text"
                  value={companyInput}
                  onChange={(e) => setCompanyInput(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: لازوردي" : "e.g. L'azurde"}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="i-sku">{locale === "ar" ? "رمز القطعة (SKU)" : "SKU"}</Label>
                  <Input
                    id="i-sku"
                    type="text"
                    required
                    value={skuInput}
                    onChange={(e) => setSkuInput(e.target.value)}
                    placeholder="RNG-2204"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-karat">{locale === "ar" ? "العيار" : "Gold Karat"}</Label>
                  <select
                    id="i-karat"
                    value={karatInput}
                    onChange={(e) => setKaratInput(Number(e.target.value))}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring h-10"
                  >
                    <option value="24">24K</option>
                    <option value="21">21K</option>
                    <option value="18">18K</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="i-gross">{locale === "ar" ? "الوزن (جرام)" : "Weight (g)"}</Label>
                  <Input
                    id="i-gross"
                    type="number"
                    step="0.001"
                    required
                    value={grossWeightInput}
                    onChange={(e) => setGrossWeightInput(e.target.value)}
                    placeholder="0.000"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="i-mfg">{locale === "ar" ? "المصنعية للجرام (ج.م)" : "Mfg Cost/g (EGP)"}</Label>
                  <Input
                    id="i-mfg"
                    type="number"
                    value={mfgCostInput}
                    onChange={(e) => setMfgCostInput(e.target.value)}
                    placeholder="120"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl h-11"
                >
                  {locale === "ar" ? "إلغاء" : "Cancel"}
                </Button>
                <Button type="submit" variant="gold" className="rounded-xl h-11">
                  {locale === "ar" ? "إضافة القطعة" : "Add Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

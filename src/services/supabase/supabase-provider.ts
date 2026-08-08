import { createClient } from "@supabase/supabase-js";
import type { ServiceRegistry } from "../contracts";
import { mockServices } from "../mock/mock-provider";
import type { GoldPrice, Invoice, Karat } from "@/types/domain";
import type { Paginated } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Custom helper to generate nice invoice numbers
function generateInvoiceNumber(type: "sale" | "purchase"): string {
  const prefix = type === "sale" ? "INV" : "PUR";
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${randomNum}`;
}

export const supabaseServices: ServiceRegistry = {
  // Delegate static / administration modules to mock or local storage
  auth: mockServices.auth,
  inventory: {
    list: async (params) => {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("inventory")
        .select("*", { count: "exact" })
        .in("karat", [18, 21, 24])
        .order("created_at", { ascending: false });

      if (params?.search) {
        query = query.or(`sku.ilike.%${params.search}%,name.ilike.%${params.search}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      const items: InventoryItem[] = (data || []).map((row) => ({
        id: row.id,
        sku: row.sku,
        barcode: row.barcode || "",
        name: row.name,
        category: row.category,
        karat: row.karat as any,
        grossWeight: Number(row.gross_weight),
        stoneWeight: Number(row.stone_weight),
        netWeight: Number(row.net_weight),
        manufacturingCost: Number(row.manufacturing_cost),
        trayId: row.tray_id || null,
        status: row.status as any,
      }));

      return {
        items,
        total: count || 0,
        page,
        pageSize,
      };
    },

    byId: async (id) => {
      const { data, error } = await supabase
        .from("inventory")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;

      return {
        id: data.id,
        sku: data.sku,
        barcode: data.barcode || "",
        name: data.name,
        category: data.category,
        karat: data.karat as any,
        grossWeight: Number(data.gross_weight),
        stoneWeight: Number(data.stone_weight),
        netWeight: Number(data.net_weight),
        manufacturingCost: Number(data.manufacturing_cost),
        trayId: data.tray_id || null,
        status: data.status as any,
      };
    },

    createItem: async (input) => {
      const barcode = `628100000${Math.floor(1000 + Math.random() * 9000)}`;
      const { data, error } = await supabase
        .from("inventory")
        .insert({
          sku: input.sku,
          barcode: barcode,
          name: input.name,
          category: input.category,
          karat: input.karat,
          gross_weight: input.grossWeight,
          stone_weight: input.stoneWeight,
          net_weight: input.netWeight,
          manufacturing_cost: input.manufacturingCost,
          tray_id: input.trayId,
          status: "in_stock"
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        sku: data.sku,
        barcode: data.barcode || "",
        name: data.name,
        category: data.category,
        karat: data.karat as any,
        grossWeight: Number(data.gross_weight),
        stoneWeight: Number(data.stone_weight),
        netWeight: Number(data.net_weight),
        manufacturingCost: Number(data.manufacturing_cost),
        trayId: data.tray_id || null,
        status: data.status as any,
      };
    }
  },
  reconciliation: {
    currentDay: async () => {
      const todayDateStr = new Date().toISOString().slice(0, 10);

      // 1. Fetch today's records
      const { data: todayRows, error: fetchError } = await supabase
        .from("reconciliation")
        .select("*")
        .eq("date", todayDateStr);

      if (fetchError) throw fetchError;

      const karats = [18, 21, 24];

      // Define date range for today's transactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      // Fetch today's invoices
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      if (invoicesError) throw invoicesError;

      // Fetch today's added retail items
      const { data: addedInventory, error: inventoryError } = await supabase
        .from("inventory")
        .select("net_weight, karat")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString());

      if (inventoryError) throw inventoryError;

      // If today's records don't exist yet, we initialize them
      if (!todayRows || todayRows.length === 0) {
        const newRows = [];
        for (const k of karats) {
          // Calculate dynamic initial opening weight
          const { data: pastInvoices } = await supabase
            .from("invoices")
            .select("net_weight, total_weight, transaction_type")
            .eq("karat", k)
            .lt("created_at", todayStart.toISOString());

          const { data: pastInventory } = await supabase
            .from("inventory")
            .select("net_weight")
            .eq("karat", k)
            .lt("created_at", todayStart.toISOString());

          const pastReceivedScrap = (pastInvoices || [])
            .filter((inv) => inv.transaction_type === "purchase")
            .reduce((sum, inv) => sum + Number(inv.net_weight || 0), 0);

          const pastReceivedInventory = (pastInventory || [])
            .reduce((sum, item) => sum + Number(item.net_weight || 0), 0);

          const pastSold = (pastInvoices || [])
            .filter((inv) => inv.transaction_type === "sale")
            .reduce((sum, inv) => sum + Number(inv.total_weight || 0), 0);

          const dbOpeningWeight = pastReceivedScrap + pastReceivedInventory - pastSold;

          // Find yesterday's closed weight or default baseline
          const { data: prevRows } = await supabase
            .from("reconciliation")
            .select("counted_weight, expected_weight")
            .eq("karat", k)
            .eq("status", "closed")
            .order("date", { ascending: false })
            .limit(1);

          const openingWeight = prevRows && prevRows[0]
            ? Number(prevRows[0].counted_weight || prevRows[0].expected_weight)
            : dbOpeningWeight;

          // Calculate today's live purchases, added finished stock, and sales
          const karatInvoices = (invoices || []).filter((inv) => Math.round(Number(inv.karat)) === k);
          const karatAdded = (addedInventory || []).filter((item) => Math.round(Number(item.karat)) === k);

          const receivedScrap = karatInvoices
            .filter((inv) => inv.transaction_type === "purchase")
            .reduce((sum, inv) => sum + Number(inv.net_weight || 0), 0);
          
          const receivedInventory = karatAdded
            .reduce((sum, item) => sum + Number(item.net_weight || 0), 0);

          const received = receivedScrap + receivedInventory;

          const sold = karatInvoices
            .filter((inv) => inv.transaction_type === "sale")
            .reduce((sum, inv) => sum + Number(inv.total_weight || 0), 0);

          const expected = openingWeight + received - sold;

          const { data: inserted, error: insertError } = await supabase
            .from("reconciliation")
            .insert({
              date: todayDateStr,
              karat: k,
              opening_weight: openingWeight,
              received_weight: received,
              sold_weight: sold,
              expected_weight: expected,
              status: "open"
            })
            .select();

          if (insertError) throw insertError;
          if (inserted && inserted[0]) {
            newRows.push(inserted[0]);
          }
        }

        return newRows.map((row) => ({
          karat: row.karat,
          opening: Number(row.opening_weight),
          received: Number(row.received_weight),
          sold: Number(row.sold_weight),
          returned: 0,
          adjusted: 0,
          expected: Number(row.expected_weight),
          counted: row.counted_weight !== null ? Number(row.counted_weight) : null,
          variance: row.variance !== null ? Number(row.variance) : null,
          status: row.status,
        }));
      }

      // If they exist, we update open records with live transaction numbers
      const updatedRows = [];
      for (const row of todayRows) {
        if (row.status === "open") {
          const k = row.karat;
          const karatInvoices = (invoices || []).filter((inv) => Math.round(Number(inv.karat)) === k);
          const karatAdded = (addedInventory || []).filter((item) => Math.round(Number(item.karat)) === k);

          const receivedScrap = karatInvoices
            .filter((inv) => inv.transaction_type === "purchase")
            .reduce((sum, inv) => sum + Number(inv.net_weight || 0), 0);

          const receivedInventory = karatAdded
            .reduce((sum, item) => sum + Number(item.net_weight || 0), 0);

          const received = receivedScrap + receivedInventory;

          const sold = karatInvoices
            .filter((inv) => inv.transaction_type === "sale")
            .reduce((sum, inv) => sum + Number(inv.total_weight || 0), 0);

          // Calculate dynamic initial opening weight
          const { data: pastInvoices } = await supabase
            .from("invoices")
            .select("net_weight, total_weight, transaction_type")
            .eq("karat", k)
            .lt("created_at", todayStart.toISOString());

          const { data: pastInventory } = await supabase
            .from("inventory")
            .select("net_weight")
            .eq("karat", k)
            .lt("created_at", todayStart.toISOString());

          const pastReceivedScrap = (pastInvoices || [])
            .filter((inv) => inv.transaction_type === "purchase")
            .reduce((sum, inv) => sum + Number(inv.net_weight || 0), 0);

          const pastReceivedInventory = (pastInventory || [])
            .reduce((sum, item) => sum + Number(item.net_weight || 0), 0);

          const pastSold = (pastInvoices || [])
            .filter((inv) => inv.transaction_type === "sale")
            .reduce((sum, inv) => sum + Number(inv.total_weight || 0), 0);

          const dbOpeningWeight = pastReceivedScrap + pastReceivedInventory - pastSold;

          // Find yesterday's closed weight or default baseline
          const { data: prevRows } = await supabase
            .from("reconciliation")
            .select("counted_weight, expected_weight")
            .eq("karat", k)
            .eq("status", "closed")
            .order("date", { ascending: false })
            .limit(1);

          const opening = prevRows && prevRows[0]
            ? Number(prevRows[0].counted_weight || prevRows[0].expected_weight)
            : dbOpeningWeight;

          const expected = opening + received - sold;

          const { data: updated, error: updateError } = await supabase
            .from("reconciliation")
            .update({
              opening_weight: opening,
              received_weight: received,
              sold_weight: sold,
              expected_weight: expected
            })
            .eq("id", row.id)
            .select();

          if (updateError) throw updateError;
          if (updated && updated[0]) {
            updatedRows.push(updated[0]);
          } else {
            updatedRows.push(row);
          }
        } else {
          updatedRows.push(row);
        }
      }

      return updatedRows
        .filter((row) => [18, 21, 24].includes(Math.round(Number(row.karat))))
        .map((row) => ({
          karat: row.karat,
          opening: Number(row.opening_weight),
          received: Number(row.received_weight),
          sold: Number(row.sold_weight),
          returned: 0,
          adjusted: 0,
          expected: Number(row.expected_weight),
          counted: row.counted_weight !== null ? Number(row.counted_weight) : null,
          variance: row.variance !== null ? Number(row.variance) : null,
          status: row.status,
        }));
    },

    submitCounted: async (karat: number, counted: number) => {
      const todayDateStr = new Date().toISOString().slice(0, 10);

      // Fetch today's open row for this karat
      const { data: rows, error: fetchError } = await supabase
        .from("reconciliation")
        .select("*")
        .eq("date", todayDateStr)
        .eq("karat", karat);

      if (fetchError) throw fetchError;
      if (!rows || rows.length === 0) throw new Error("No reconciliation record found for today");

      const row = rows[0];
      const expected = Number(row.expected_weight);
      const variance = counted - expected;

      const { error: updateError } = await supabase
        .from("reconciliation")
        .update({
          counted_weight: counted,
          variance: variance,
          status: "closed"
        })
        .eq("id", row.id);

      if (updateError) throw updateError;
    },

    reopenToday: async () => {
      const todayDateStr = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("reconciliation")
        .update({
          status: "open",
          counted_weight: null,
          variance: null
        })
        .eq("date", todayDateStr);

      if (error) throw error;
    },

    updateOpeningWeights: async (inputs: { karat: number; weight: number }[]) => {
      const todayDateStr = new Date().toISOString().slice(0, 10);
      for (const input of inputs) {
        const { data: rows } = await supabase
          .from("reconciliation")
          .select("*")
          .eq("date", todayDateStr)
          .eq("karat", input.karat);

        if (rows && rows[0]) {
          const row = rows[0];
          const received = Number(row.received_weight || 0);
          const sold = Number(row.sold_weight || 0);
          const expected = input.weight + received - sold;

          const { error: updateError } = await supabase
            .from("reconciliation")
            .update({
              opening_weight: input.weight,
              expected_weight: expected
            })
            .eq("id", row.id);

          if (updateError) throw updateError;
        }
      }
    }
  },
  reports: mockServices.reports,
  analytics: {
    summary: async () => {
      // 1. Get range for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // 2. Fetch sales for revenue trend
      const { data: salesData, error: salesError } = await supabase
        .from("invoices")
        .select("created_at, final_total")
        .eq("transaction_type", "sale")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (salesError) throw salesError;

      // 3. Fetch in-stock items for karat weight distribution
      const { data: inStockItems, error: itemsError } = await supabase
        .from("inventory")
        .select("net_weight, karat")
        .eq("status", "in_stock")
        .in("karat", [18, 21, 24]);

      if (itemsError) throw itemsError;

      // 4. Build daily labels and aggregate revenue
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const revenueTrend = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayLabel = days[d.getDay()];
        
        // Find sales on this date
        const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const daySales = (salesData || []).filter((row) => {
          const rowDate = new Date(row.created_at).toISOString().slice(0, 10);
          return rowDate === dateStr;
        });

        const dayValue = daySales.reduce((sum, row) => sum + Number(row.final_total), 0);
        revenueTrend.push({
          label: dayLabel,
          value: dayValue,
        });
      }

      // 5. Aggregate inventory weight by karat
      const karatWeightMap: Record<number, number> = { 24: 0, 21: 0, 18: 0 };
      
      (inStockItems || []).forEach((row) => {
        const karat = Math.round(Number(row.karat));
        if (karat in karatWeightMap) {
          karatWeightMap[karat] += Number(row.net_weight || 0);
        }
      });

      const weightByKarat = [
        { label: "24K", value: Number(karatWeightMap[24].toFixed(3)) },
        { label: "21K", value: Number(karatWeightMap[21].toFixed(3)) },
        { label: "18K", value: Number(karatWeightMap[18].toFixed(3)) },
      ].filter(item => item.value > 0);

      return {
        revenueTrend,
        weightByKarat,
      };
    },
  },
  users: mockServices.users,
  settings: {
    get: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "default")
        .single();

      if (error) throw error;

      return {
        shopName: data.shop_name,
        shopNameAr: data.shop_name_ar,
        ownerName: data.owner_name,
        email: data.email,
        phone: data.phone,
        commercialRegister: data.commercial_register,
        taxId: data.tax_id,
        governorate: data.governorate,
        city: data.city,
        address: data.address,
        logoUrl: data.logo_url,
        currency: data.currency,
        receiptHeader: data.receipt_header,
        receiptFooter: data.receipt_footer,
        returnPolicy: "",
        vatRate: Number(data.vat_rate),
        vatOnManufacturingOnly: Boolean(data.vat_on_manufacturing_only),
        defaultManufacturingCost: Number(data.default_manufacturing_cost),
        roundingMode: data.rounding_mode as any,
        defaultKarat: 21,
      };
    },

    update: async (input: Partial<ShopSettings>) => {
      const dbFields: any = {};
      if (input.shopName !== undefined) dbFields.shop_name = input.shopName;
      if (input.shopNameAr !== undefined) dbFields.shop_name_ar = input.shopNameAr;
      if (input.ownerName !== undefined) dbFields.owner_name = input.ownerName;
      if (input.email !== undefined) dbFields.email = input.email;
      if (input.phone !== undefined) dbFields.phone = input.phone;
      if (input.commercialRegister !== undefined) dbFields.commercial_register = input.commercialRegister;
      if (input.taxId !== undefined) dbFields.tax_id = input.taxId;
      if (input.governorate !== undefined) dbFields.governorate = input.governorate;
      if (input.city !== undefined) dbFields.city = input.city;
      if (input.address !== undefined) dbFields.address = input.address;
      if (input.logoUrl !== undefined) dbFields.logo_url = input.logoUrl;
      if (input.currency !== undefined) dbFields.currency = input.currency;
      if (input.receiptHeader !== undefined) dbFields.receipt_header = input.receiptHeader;
      if (input.receiptFooter !== undefined) dbFields.receipt_footer = input.receiptFooter;
      if (input.vatRate !== undefined) dbFields.vat_rate = input.vatRate;
      if (input.vatOnManufacturingOnly !== undefined) dbFields.vat_on_manufacturing_only = input.vatOnManufacturingOnly;
      if (input.defaultManufacturingCost !== undefined) dbFields.default_manufacturing_cost = input.defaultManufacturingCost;
      if (input.roundingMode !== undefined) dbFields.rounding_mode = input.roundingMode;

      const { data, error } = await supabase
        .from("settings")
        .update(dbFields)
        .eq("id", "default")
        .select()
        .single();

      if (error) throw error;

      return {
        shopName: data.shop_name,
        shopNameAr: data.shop_name_ar,
        ownerName: data.owner_name,
        email: data.email,
        phone: data.phone,
        commercialRegister: data.commercial_register,
        taxId: data.tax_id,
        governorate: data.governorate,
        city: data.city,
        address: data.address,
        logoUrl: data.logo_url,
        currency: data.currency,
        receiptHeader: data.receipt_header,
        receiptFooter: data.receipt_footer,
        returnPolicy: "",
        vatRate: Number(data.vat_rate),
        vatOnManufacturingOnly: Boolean(data.vat_on_manufacturing_only),
        defaultManufacturingCost: Number(data.default_manufacturing_cost),
        roundingMode: data.rounding_mode as any,
        defaultKarat: 21,
      };
    },
  },

  dashboard: {
    summary: async () => {
      // 1. Get today's and yesterday's ranges
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
      const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);

      // 2. Query today's invoices
      const { data: todayInvoices } = await supabase
        .from("invoices")
        .select("*")
        .gte("created_at", todayStart.toISOString())
        .lte("created_at", todayEnd.toISOString())
        .order("created_at", { ascending: false });

      // Query yesterday's invoices
      const { data: yesterdayInvoices } = await supabase
        .from("invoices")
        .select("*")
        .gte("created_at", yesterdayStart.toISOString())
        .lte("created_at", yesterdayEnd.toISOString());

      // 3. Query all invoices for total scrap stash weight
      const { data: allPurchases } = await supabase
        .from("invoices")
        .select("net_weight")
        .eq("transaction_type", "purchase")
        .in("karat", [18, 21, 24]);

      const stashWeight = (allPurchases || []).reduce((sum, row) => sum + Number(row.net_weight || 0), 0);

      // 4. Query all in-stock finished items to compute real inventory value
      const { data: inStockItems } = await supabase
        .from("inventory")
        .select("*")
        .eq("status", "in_stock")
        .in("karat", [18, 21, 24]);

      // 5. Query latest gold prices
      const todayPrices = await supabaseServices.goldPrices.today();

      let inventoryValue = 0;
      let inventoryWeight = 0;
      (inStockItems || []).forEach((item) => {
        const rate = todayPrices.find((p) => p.karat === item.karat)?.rate || 4500;
        const itemVal = Number(item.net_weight) * (rate + Number(item.manufacturing_cost || 0));
        inventoryValue += itemVal;
        inventoryWeight += Number(item.net_weight || 0);
      });

      // 6. Calculate dashboard metrics for today
      const invoices = todayInvoices || [];
      const sales = invoices.filter((i) => i.transaction_type === "sale");
      const purchases = invoices.filter((i) => i.transaction_type === "purchase");

      const revenueToday = sales.reduce((sum, i) => sum + Number(i.final_total), 0);
      const purchasesToday = purchases.reduce((sum, i) => sum + Number(i.final_total), 0);
      const transactionsToday = invoices.length;

      // 7. Calculate yesterday's metrics for growth comparison
      const yInvoices = yesterdayInvoices || [];
      const ySales = yInvoices.filter((i) => i.transaction_type === "sale");
      const yPurchases = yInvoices.filter((i) => i.transaction_type === "purchase");

      const revenueYesterday = ySales.reduce((sum, i) => sum + Number(i.final_total), 0);
      const purchasesYesterday = yPurchases.reduce((sum, i) => sum + Number(i.final_total), 0);
      const transactionsYesterday = yInvoices.length;

      let revenueChangePct = 0;
      if (revenueYesterday > 0) {
        revenueChangePct = ((revenueToday - revenueYesterday) / revenueYesterday) * 100;
      } else if (revenueToday > 0) {
        revenueChangePct = 100;
      }

      let purchasesChangePct = 0;
      if (purchasesYesterday > 0) {
        purchasesChangePct = ((purchasesToday - purchasesYesterday) / purchasesYesterday) * 100;
      } else if (purchasesToday > 0) {
        purchasesChangePct = 100;
      }

      const transactionsChangeCount = transactionsToday - transactionsYesterday;

      // 8. Get last 10 invoices for recent activity feed
      const { data: recentInvoices } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      const recentActivity = (recentInvoices || []).map((inv) => ({
        id: inv.id,
        type: inv.transaction_type === "sale" ? "sale" : "purchase",
        title: inv.transaction_type === "sale" ? "عملية بيع جديدة" : "عملية شراء ذهب كسر",
        subtitle: `رقم الفاتورة: ${inv.invoice_number} · ${Number(inv.final_total).toLocaleString()} ج.م`,
        at: inv.created_at,
        meta: inv.payment_method === "cash" ? "نقدي" : inv.payment_method === "card" ? "بطاقة" : "تحويل",
      }));

      // 9. Query today's reconciliation status
      const todayDateStr = new Date().toISOString().slice(0, 10);
      const { data: todayReconciliation } = await supabase
        .from("reconciliation")
        .select("status")
        .eq("date", todayDateStr);

      const isReconciliationClosed = todayReconciliation && todayReconciliation.length > 0
        ? todayReconciliation.every((row) => row.status === "closed")
        : false;

      const alerts: any[] = [];

      return {
        revenueToday,
        purchasesToday,
        transactionsToday,
        inventoryValue: Math.round(inventoryValue),
        inventoryWeight: Number(inventoryWeight.toFixed(3)),
        stashWeight: Math.round(stashWeight),
        prices: todayPrices,
        recentActivity,
        alerts,
        isReconciliationClosed,
        revenueChangePct: Number(revenueChangePct.toFixed(1)),
        purchasesChangePct: Number(purchasesChangePct.toFixed(1)),
        transactionsChangeCount,
      };
    },
  },

  // ── Gold Prices Service ──────────────────────────────────────────────────
  goldPrices: {
    today: async () => {
      // Fetch latest prices for each karat from database
      const karats: Karat[] = [24, 21, 18];
      const todayPrices: GoldPrice[] = [];

      for (const karat of karats) {
        const { data, error } = await supabase
          .from("gold_prices")
          .select("*")
          .eq("karat", karat)
          .order("updated_at", { ascending: false })
          .limit(2);

        if (error) throw error;

        if (data && data.length > 0) {
          const row = data[0];
          const currentRate = Number(row.rate_sell);
          let changePct = 0;
          if (data.length > 1) {
            const prevRate = Number(data[1].rate_sell);
            if (prevRate > 0) {
              changePct = ((currentRate - prevRate) / prevRate) * 100;
            }
          }

          todayPrices.push({
            date: row.updated_at,
            karat: row.karat as Karat,
            rate: currentRate,
            rateBuy: Number(row.rate_buy),
            changePct: Number(changePct.toFixed(2)),
            source: "manual",
          });
        }
      }

      // If database has no prices, fallback to standard mock values
      if (todayPrices.length === 0) {
        const mockPrices = await mockServices.goldPrices.today();
        return mockPrices.map(p => ({
          ...p,
          rateBuy: Math.round(p.rate * 0.97), // buying price is slightly lower
        }));
      }

      return todayPrices;
    },

    history: async (params) => {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await supabase
        .from("gold_prices")
        .select("*", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items: GoldPrice[] = [];

      for (const row of (data || [])) {
        // Query the next older record for this karat to compute changePct
        const { data: olderData } = await supabase
          .from("gold_prices")
          .select("rate_sell")
          .eq("karat", row.karat)
          .lt("updated_at", row.updated_at)
          .order("updated_at", { ascending: false })
          .limit(1);

        const currentRate = Number(row.rate_sell);
        let changePct = 0;
        if (olderData && olderData.length > 0) {
          const prevRate = Number(olderData[0].rate_sell);
          if (prevRate > 0) {
            changePct = ((currentRate - prevRate) / prevRate) * 100;
          }
        }

        items.push({
          date: row.updated_at,
          karat: row.karat as Karat,
          rate: currentRate,
          rateBuy: Number(row.rate_buy),
          changePct: Number(changePct.toFixed(2)),
          source: "manual",
        });
      }

      return {
        items,
        total: count || 0,
        page,
        pageSize,
      };
    },

    setPrice: async (input) => {
      // Set buying rate to 97% of selling if not supplied
      const rateBuy = input.rate * 0.97;
      const { data, error } = await supabase
        .from("gold_prices")
        .insert({
          karat: input.karat,
          rate_sell: input.rate,
          rate_buy: rateBuy,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        date: data.updated_at,
        karat: data.karat as Karat,
        rate: Number(data.rate_sell),
        rateBuy: Number(data.rate_buy),
        source: "manual",
      };
    },

    setMultiple: async (input) => {
      const rows = Object.entries(input.rates).map(([karat, rate]) => {
        const rateSell = rate as number;
        // Egyptian market typical buy rate is slightly lower than sell rate
        const rateBuy = Math.round(rateSell * 0.975);
        return {
          karat: Number(karat),
          rate_sell: rateSell,
          rate_buy: rateBuy,
        };
      });

      const { data, error } = await supabase
        .from("gold_prices")
        .insert(rows)
        .select();

      if (error) throw error;

      return (data || []).map((row) => ({
        date: row.updated_at,
        karat: row.karat as Karat,
        rate: Number(row.rate_sell),
        rateBuy: Number(row.rate_buy),
        source: "manual",
      }));
    },
  },

  // ── Sales (Invoices) Service ──────────────────────────────────────────────
  sales: {
    listInvoices: async (params) => {
      const page = params?.page || 1;
      const pageSize = params?.pageSize || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("invoices")
        .select("*, inventory(sku, company)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (params?.search) {
        query = query.or(`invoice_number.ilike.%${params.search}%,customer_name.ilike.%${params.search}%`);
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      const items: Invoice[] = (data || []).map((row: any) => ({
        id: row.id,
        number: row.invoice_number,
        cashierId: "current_user",
        subtotal: Number(row.gold_value) + Number(row.handwork_value),
        discount: 0,
        tax: Number(row.tax_value),
        total: Number(row.final_total),
        paymentMethod: row.payment_method as any,
        createdAt: row.created_at,
        transactionType: row.transaction_type as any,
        customerName: row.customer_name || undefined,
        customerPhone: row.customer_phone || undefined,
        deductionPct: Number(row.deduction_pct),
        idImageUrl: row.id_image_url || undefined,
        karat: row.karat || undefined,
        weight: row.total_weight || undefined,
        itemType: row.item_type || undefined,
        itemId: row.item_id || undefined,
        itemSku: row.inventory?.sku || undefined,
        itemCompany: row.inventory?.company || undefined,
      }));

      return {
        items,
        total: count || 0,
        page,
        pageSize,
      };
    },

    createInvoice: async (input) => {
      const type = input.transactionType || "sale";
      const invoiceNumber = input.number || generateInvoiceNumber(type);

      const dbRow = {
        invoice_number: invoiceNumber,
        transaction_type: type,
        customer_name: input.customerName || null,
        customer_phone: input.customerPhone || null,
        total_weight: input.weight || 0,
        deduction_pct: input.deductionPct || 0,
        net_weight: input.weight ? (input.weight * (1 - (input.deductionPct || 0) / 100)) : 0,
        gold_value: input.subtotal - (input.handwork_value || 0), // backward derive gold content value
        handwork_value: input.handwork_value || 0,
        tax_value: input.tax || 0,
        final_total: input.total,
        payment_method: input.paymentMethod,
        id_image_url: input.idImageUrl || null,
        karat: input.karat || null,
        item_type: input.itemType || null,
        item_id: input.itemId || null,
      };

      const { data, error } = await supabase
        .from("invoices")
        .insert(dbRow)
        .select("*, inventory(sku, company)")
        .single();

      if (error) throw error;

      // If an inventory item was selected, mark it as sold in the database!
      if (input.itemId) {
        const { error: inventoryError } = await supabase
          .from("inventory")
          .update({ status: "sold" })
          .eq("id", input.itemId);

        if (inventoryError) throw inventoryError;
      }

      return {
        id: data.id,
        number: data.invoice_number,
        cashierId: "current_user",
        subtotal: Number(data.gold_value) + Number(data.handwork_value),
        discount: 0,
        tax: Number(data.tax_value),
        total: Number(data.final_total),
        paymentMethod: data.payment_method as any,
        createdAt: data.created_at,
        transactionType: data.transaction_type as any,
        customerName: data.customer_name || undefined,
        customerPhone: data.customer_phone || undefined,
        deductionPct: Number(data.deduction_pct),
        idImageUrl: data.id_image_url || undefined,
        karat: data.karat || undefined,
        weight: data.total_weight || undefined,
        itemType: data.item_type || undefined,
        itemId: data.item_id || undefined,
        itemSku: (data as any).inventory?.sku || undefined,
        itemCompany: (data as any).inventory?.company || undefined,
      };
    },
  },
};

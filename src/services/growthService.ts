import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  sku: string | null;
  name: string;
  category: string | null;
  price: number;
  cost: number;
  stock: number;
  status: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  total_spent: number;
  orders_count: number;
  segment: string;
  last_order_at: string | null;
  created_at: string;
};

export type Order = {
  id: string;
  order_number: string | null;
  customer_id: string | null;
  channel: string;
  status: string;
  total: number;
  discount: number;
  placed_at: string;
};

export type MarketMetric = {
  id: string;
  source: string;
  metric: string;
  value: number;
  period_start: string | null;
  period_end: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CrmDeal = {
  id: string;
  title: string;
  customer_id: string | null;
  stage: string;
  value: number;
  probability: number;
  expected_close_at: string | null;
  notes: string | null;
  created_at: string;
};

export type KpiSnapshot = {
  id: string;
  name: string;
  value: number;
  target: number | null;
  reference_date: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AiInsight = {
  id: string;
  kind: string;
  title: string;
  summary: string | null;
  severity: string;
  data: Record<string, unknown>;
  created_at: string;
};

async function all<T>(table: string, order = "created_at", limit = 500): Promise<T[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("*")
    .order(order, { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as T[];
}

export const growthService = {
  products: () => all<Product>("products", "created_at", 500),
  customers: () => all<Customer>("customers", "total_spent", 500),
  orders: () => all<Order>("orders", "placed_at", 500),
  marketMetrics: () => all<MarketMetric>("market_metrics", "created_at", 500),
  crmDeals: () => all<CrmDeal>("crm_deals", "created_at", 500),
  kpiSnapshots: () => all<KpiSnapshot>("kpi_snapshots", "reference_date", 500),
  aiInsights: () => all<AiInsight>("ai_insights", "created_at", 200),
};

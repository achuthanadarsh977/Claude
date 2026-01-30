import { Database } from "sqlite";

interface ProductDetails {
  id: number;
  name: string;
  sku: string;
  price: number;
  is_active: number;
  category_name: string;
  total_inventory: number;
  average_rating: number;
}

interface ProductByCategory {
  id: number;
  name: string;
  price: number;
  total_quantity_sold: number;
  days_since_last_ordered: number | null;
}

interface LowStockProduct {
  id: number;
  name: string;
  sku: string;
  category_name: string;
  total_quantity: number;
  last_restock_date: string | null;
  pending_order_count: number;
}

interface ProductBySku {
  id: number;
  name: string;
  sku: string;
  price: number;
  warehouse_quantities: string;
  active_review_count: number;
  orders_last_30_days: number;
}

interface AvailableProduct {
  id: number;
  name: string;
  sku: string;
  category_path: string;
  weight: number;
  total_inventory: number;
  reserved_quantities: number;
}

interface ProductNeedingReorder {
  id: number;
  name: string;
  sku: string;
  reorder_level: number;
  current_stock: number;
  vendor_info: string;
  daily_sales_velocity: number;
}

interface ProductSearchResult {
  id: number;
  name: string;
  is_active: number;
  total_revenue: number;
  inventory_status: string;
}

export async function getProductDetails(
  db: Database,
  productId: number,
): Promise<ProductDetails | null> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.sku,
        p.price,
        p.is_active,
        c.name as category_name,
        COALESCE(SUM(i.quantity), 0) as total_inventory,
        COALESCE(AVG(r.rating), 0) as average_rating
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN reviews r ON p.id = r.product_id
    WHERE p.id = ?
    GROUP BY p.id, p.name, p.sku, p.price, p.is_active, c.name
  `;

  const result = await db.get(query, [productId]);
  return result as ProductDetails | null;
}

export async function findProductsByCategory(
  db: Database,
  categoryId: number,
): Promise<ProductByCategory[]> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.price,
        COALESCE(SUM(oi.quantity), 0) as total_quantity_sold,
        JULIANDAY('now') - JULIANDAY(MAX(o.created_at)) as days_since_last_ordered
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE p.category_id = ?
    GROUP BY p.id, p.name, p.price
  `;

  const results = await db.all(query, [categoryId]);
  return results as ProductByCategory[];
}

export async function getLowStockProducts(
  db: Database,
  threshold: number = 20,
): Promise<LowStockProduct[]> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.sku,
        c.name as category_name,
        COALESCE(SUM(i.quantity), 0) as total_quantity,
        i.last_restocked as last_restock_date,
        COUNT(DISTINCT CASE WHEN o.status = 'pending' THEN oi.order_id END) as pending_order_count
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    GROUP BY p.id, p.name, p.sku, c.name, i.last_restocked
    HAVING COALESCE(SUM(i.quantity), 0) < ?
  `;

  const results = await db.all(query, [threshold]);
  return results as LowStockProduct[];
}

export async function fetchProductBySku(
  db: Database,
  sku: string,
): Promise<ProductBySku | null> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.sku,
        p.price,
        GROUP_CONCAT(w.city || ':' || COALESCE(i.quantity, 0)) as warehouse_quantities,
        COUNT(DISTINCT r.id) as active_review_count,
        COUNT(DISTINCT CASE
            WHEN o.created_at >= datetime('now', '-30 days')
            THEN oi.order_id
        END) as orders_last_30_days
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN warehouses w ON i.warehouse_id = w.id
    LEFT JOIN reviews r ON p.id = r.product_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    WHERE p.sku = ?
    GROUP BY p.id, p.name, p.sku, p.price
  `;

  const result = await db.get(query, [sku]);
  return result as ProductBySku | null;
}

export async function listAvailableProducts(
  db: Database,
): Promise<AvailableProduct[]> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.sku,
        c.name as category_path,
        p.weight,
        COALESCE(SUM(i.quantity), 0) as total_inventory,
        COALESCE(SUM(i.reserved_quantity), 0) as reserved_quantities
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.is_active = 1
    GROUP BY p.id, p.name, p.sku, c.name, p.weight
    HAVING COALESCE(SUM(i.quantity), 0) > 0
  `;

  const results = await db.all(query, []);
  return results as AvailableProduct[];
}

export async function getProductsNeedingReorder(
  db: Database,
): Promise<ProductNeedingReorder[]> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.sku,
        i.reorder_level,
        COALESCE(SUM(i.quantity), 0) as current_stock,
        p.description as vendor_info,
        COALESCE(SUM(CASE
            WHEN o.created_at >= datetime('now', '-30 days')
            THEN oi.quantity
        END), 0) / 30.0 as daily_sales_velocity
    FROM products p
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN orders o ON oi.order_id = o.id
    GROUP BY p.id, p.name, p.sku, i.reorder_level, p.description
    HAVING COALESCE(SUM(i.quantity), 0) < i.reorder_level
  `;

  const results = await db.all(query, []);
  return results as ProductNeedingReorder[];
}

export async function searchProductsByName(
  db: Database,
  searchTerm: string,
): Promise<ProductSearchResult[]> {
  const query = `
    SELECT
        p.id,
        p.name,
        p.is_active,
        COALESCE(SUM(oi.quantity * oi.unit_price), 0) as total_revenue,
        CASE
            WHEN COALESCE(SUM(i.quantity), 0) = 0 THEN 'out_of_stock'
            WHEN COALESCE(SUM(i.quantity), 0) < COALESCE(i.reorder_level, 10) THEN 'low_stock'
            ELSE 'in_stock'
        END as inventory_status
    FROM products p
    LEFT JOIN order_items oi ON p.id = oi.product_id
    LEFT JOIN inventory i ON p.id = i.product_id
    WHERE p.name LIKE '%' || ? || '%'
    GROUP BY p.id, p.name, p.is_active, i.reorder_level
  `;

  const results = await db.all(query, [searchTerm]);
  return results as ProductSearchResult[];
}

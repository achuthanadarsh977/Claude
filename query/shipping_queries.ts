import { Database } from "sqlite";

interface ShippingAddress {
  id: number;
  street_1: string;
  city: string;
  state: string;
  postal_code: string;
  is_default: number;
  order_count: number;
  last_used_date: string | null;
}

interface OrderByDestination {
  id: number;
  created_at: string;
  status: string;
  customer_email: string;
  destination_city: string;
  destination_state: string;
  products_ordered: string;
  delivery_days: number | null;
}

interface UnshippedOrder {
  id: number;
  created_at: string;
  email: string;
  phone: string;
  previous_order_count: number;
  shipping_address: string;
  total_amount: number;
  inventory_status: string;
}

interface ShippingCostByState {
  state: string;
  order_count: number;
  total_shipping_cost: number;
  avg_shipping_cost: number;
  avg_order_weight: number;
  top_products: string;
}

interface DeliveryDelay {
  id: number;
  created_at: string;
  current_status: string;
  days_since_order: number;
  email: string;
  phone: string;
  customer_segment: string;
  destination: string;
  products: string;
  total_amount: number;
}

export async function getShippingAddresses(
  db: Database,
  customerId: number,
): Promise<ShippingAddress[]> {
  const query = `
    SELECT
        a.id,
        a.street_1,
        a.city,
        a.state,
        a.postal_code,
        a.is_default,
        COUNT(DISTINCT o.id) as order_count,
        MAX(o.created_at) as last_used_date
    FROM addresses a
    LEFT JOIN orders o ON a.id = o.shipping_address_id
    WHERE a.customer_id = ? AND a.type IN ('shipping', 'both')
    GROUP BY a.id, a.street_1, a.city, a.state, a.postal_code, a.is_default
    ORDER BY a.is_default DESC, order_count DESC
    `;

  const rows: any[] = await db.all(query, [customerId]);
  return rows as ShippingAddress[];
}

export async function findOrdersByDestination(
  db: Database,
  state: string,
): Promise<OrderByDestination[]> {
  const query = `
    SELECT
        o.id,
        o.created_at,
        o.status,
        c.email as customer_email,
        a.city as destination_city,
        a.state as destination_state,
        GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')', ', ') as products_ordered,
        CASE
            WHEN o.status = 'delivered' THEN
                CAST((julianday(o.delivered_at) - julianday(o.created_at)) AS INTEGER)
            ELSE NULL
        END as delivery_days
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN addresses a ON o.shipping_address_id = a.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE a.state = ?
    GROUP BY o.id, o.created_at, o.status, c.email,
             a.city, a.state, o.delivered_at
    ORDER BY o.created_at DESC
    `;

  const rows: any[] = await db.all(query, [state]);
  return rows as OrderByDestination[];
}

export async function getUnshippedOrders(
  db: Database,
): Promise<UnshippedOrder[]> {
  const query = `
    WITH customer_order_counts AS (
        SELECT
            customer_id,
            COUNT(*) as total_orders
        FROM orders
        WHERE status = 'delivered'
        GROUP BY customer_id
    ),
    inventory_check AS (
        SELECT
            oi.order_id,
            MIN(CASE
                WHEN COALESCE(inv.quantity, 0) >= oi.quantity THEN 1
                ELSE 0
            END) as all_items_available
        FROM order_items oi
        LEFT JOIN inventory inv ON oi.product_id = inv.product_id
        GROUP BY oi.order_id
    )
    SELECT
        o.id,
        o.created_at,
        c.email,
        c.phone,
        COALESCE(coc.total_orders, 0) as previous_order_count,
        a.street_1 || ', ' || a.city || ', ' || a.state || ' ' || a.postal_code as shipping_address,
        o.total_amount,
        CASE
            WHEN ic.all_items_available = 1 THEN 'Ready to ship'
            ELSE 'Inventory shortage'
        END as inventory_status
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN addresses a ON o.shipping_address_id = a.id
    LEFT JOIN customer_order_counts coc ON c.id = coc.customer_id
    LEFT JOIN inventory_check ic ON o.id = ic.order_id
    WHERE o.status IN ('pending', 'processing')
    ORDER BY o.created_at ASC
    `;

  const rows: any[] = await db.all(query);
  return rows as UnshippedOrder[];
}

export async function calculateShippingCostsByState(
  db: Database,
): Promise<ShippingCostByState[]> {
  const query = `
    WITH state_products AS (
        SELECT
            a.state,
            p.name as product_name,
            SUM(oi.quantity) as total_quantity,
            ROW_NUMBER() OVER (PARTITION BY a.state ORDER BY SUM(oi.quantity) DESC) as rn
        FROM orders o
        JOIN addresses a ON o.shipping_address_id = a.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id
        GROUP BY a.state, p.name
    )
    SELECT
        a.state,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.shipping_amount) as total_shipping_cost,
        AVG(o.shipping_amount) as avg_shipping_cost,
        SUM(oi.quantity * p.weight) / COUNT(DISTINCT o.id) as avg_order_weight,
        GROUP_CONCAT(
            CASE WHEN sp.rn <= 3 THEN sp.product_name END,
            ', '
        ) as top_products
    FROM orders o
    JOIN addresses a ON o.shipping_address_id = a.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN state_products sp ON a.state = sp.state AND p.name = sp.product_name
    GROUP BY a.state
    ORDER BY total_shipping_cost DESC
    `;

  const rows: any[] = await db.all(query);
  return rows as ShippingCostByState[];
}

export async function findDeliveryDelays(
  db: Database,
  expectedDays: number = 5,
): Promise<DeliveryDelay[]> {
  const query = `
    SELECT
        o.id,
        o.created_at,
        o.status as current_status,
        CAST((julianday('now') - julianday(o.created_at)) AS INTEGER) as days_since_order,
        c.email,
        c.phone,
        COALESCE(cs.segment_name, 'Unknown') as customer_segment,
        a.city || ', ' || a.state as destination,
        GROUP_CONCAT(p.name || ' (x' || oi.quantity || ')', ', ') as products,
        o.total_amount
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN addresses a ON o.shipping_address_id = a.id
    LEFT JOIN customer_segments cs ON c.id = cs.customer_id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.status NOT IN ('delivered', 'cancelled')
    AND julianday('now') - julianday(o.created_at) > ?
    GROUP BY o.id, o.created_at, o.status, c.email, c.phone,
             cs.segment_name, a.city, a.state, o.total_amount
    ORDER BY days_since_order DESC
    `;

  const rows: any[] = await db.all(query, [expectedDays]);
  return rows as DeliveryDelay[];
}

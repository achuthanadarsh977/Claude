import { Database } from "sqlite";

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderDetails {
  id: number;
  created_at: string;
  status: string;
  total_amount: number;
  customer_email: string;
  shipping_street: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  items: OrderItem[];
}

export async function getOrderDetails(
  db: Database,
  orderId: number,
): Promise<OrderDetails | null> {
  const query = `
    SELECT
        o.id,
        o.created_at,
        o.status,
        o.total_amount,
        c.email as customer_email,
        a.street_1 as shipping_street,
        a.city as shipping_city,
        a.state as shipping_state,
        a.postal_code as shipping_zip,
        oi.id as order_item_id,
        oi.product_id,
        p.name as product_name,
        oi.quantity,
        oi.unit_price
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN addresses a ON o.shipping_address_id = a.id
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    WHERE o.id = ?
    `;

  const rows: any[] = await db.all(query, [orderId]);

  if (!rows || rows.length === 0) {
    return null;
  }

  const order: OrderDetails = {
    id: rows[0].id,
    created_at: rows[0].created_at,
    status: rows[0].status,
    total_amount: rows[0].total_amount,
    customer_email: rows[0].customer_email,
    shipping_street: rows[0].shipping_street,
    shipping_city: rows[0].shipping_city,
    shipping_state: rows[0].shipping_state,
    shipping_zip: rows[0].shipping_zip,
    items: [],
  };

  for (const row of rows) {
    order.items.push({
      id: row.order_item_id,
      product_id: row.product_id,
      product_name: row.product_name,
      quantity: row.quantity,
      unit_price: row.unit_price,
    });
  }

  return order;
}

export async function fetchCustomerOrders(
  db: Database,
  customerId: number,
  limit: number = 10,
): Promise<any[]> {
  const query = `
    SELECT
        o.id,
        o.created_at,
        o.status,
        o.total_amount,
        a.city as shipping_city,
        a.state as shipping_state,
        COUNT(oi.id) as item_count
    FROM orders o
    LEFT JOIN addresses a ON o.shipping_address_id = a.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.customer_id = ?
    GROUP BY o.id, o.created_at, o.status, o.total_amount,
             a.city, a.state
    ORDER BY o.created_at DESC
    LIMIT ?
    `;

  const rows = await db.all(query, [customerId, limit]);
  return rows;
}

export async function getPendingOrders(db: Database): Promise<any[]> {
  const query = `
    SELECT
        o.id,
        o.created_at,
        o.total_amount,
        c.first_name || ' ' || c.last_name as customer_name,
        c.phone,
        julianday('now') - julianday(o.created_at) as days_since_created
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.status = 'pending'
    ORDER BY o.created_at
    `;

  const rows = await db.all(query, []);
  return rows;
}

export async function findOrdersByStatus(
  db: Database,
  status: string,
): Promise<any[]> {
  const query = `
    SELECT DISTINCT
        o.id,
        o.created_at,
        o.total_amount,
        c.email as customer_email,
        GROUP_CONCAT(DISTINCT p.sku) as product_skus,
        GROUP_CONCAT(DISTINCT w.name) as warehouses
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN warehouses w ON i.warehouse_id = w.id
    WHERE o.status = ?
    GROUP BY o.id, o.created_at, o.total_amount, c.email
    ORDER BY o.created_at DESC
    `;

  const rows = await db.all(query, [status]);
  return rows;
}

export async function getRecentOrders(
  db: Database,
  days: number = 7,
): Promise<any[]> {
  const query = `
    SELECT DISTINCT
        o.id,
        o.created_at,
        o.total_amount,
        o.shipping_amount,
        cs.segment_name as customer_segment,
        CASE
            WHEN o.shipping_amount = 0 THEN 'Free Shipping'
            WHEN o.shipping_amount < 10 THEN 'Standard'
            WHEN o.shipping_amount < 25 THEN 'Express'
            ELSE 'Priority'
        END as shipping_method,
        GROUP_CONCAT(DISTINCT cat.name) as product_categories
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN customer_segments cs ON c.id = cs.customer_id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    LEFT JOIN categories cat ON p.category_id = cat.id
    WHERE o.created_at >= date('now', '-' || ? || ' days')
    GROUP BY o.id, o.created_at, o.total_amount, o.shipping_amount, cs.segment_name
    ORDER BY o.created_at DESC
    `;

  const rows = await db.all(query, [days]);
  return rows;
}

export async function fetchOrdersByDateRange(
  db: Database,
  startDate: string,
  endDate: string,
): Promise<any[]> {
  const query = `
    SELECT
        o.id,
        o.created_at,
        o.total_amount,
        c.status as customer_status,
        a.state as billing_state,
        COUNT(oi.id) as item_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    LEFT JOIN addresses a ON o.billing_address_id = a.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE o.created_at >= ? AND o.created_at <= ?
    GROUP BY o.id, o.created_at, o.total_amount, c.status, a.state
    ORDER BY o.created_at DESC
    `;

  const rows = await db.all(query, [startDate, endDate]);
  return rows;
}

export async function getHighValueOrders(
  db: Database,
  minAmount: number = 500,
): Promise<any[]> {
  const query = `
    WITH customer_ltv AS (
        SELECT
            customer_id,
            SUM(total_amount) as lifetime_value
        FROM orders
        GROUP BY customer_id
    )
    SELECT DISTINCT
        o.id,
        o.created_at,
        o.total_amount,
        c.email,
        ltv.lifetime_value as customer_lifetime_value,
        a.street_1 as shipping_address,
        a.city as shipping_city,
        a.state as shipping_state,
        a.postal_code as shipping_zip,
        GROUP_CONCAT(p.name) as product_names
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN customer_ltv ltv ON c.id = ltv.customer_id
    LEFT JOIN addresses a ON o.shipping_address_id = a.id
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE o.total_amount >= ?
    GROUP BY o.id, o.created_at, o.total_amount, c.email,
             ltv.lifetime_value, a.street_1, a.city,
             a.state, a.postal_code
    ORDER BY o.total_amount DESC
    `;

  const rows = await db.all(query, [minAmount]);
  return rows;
}

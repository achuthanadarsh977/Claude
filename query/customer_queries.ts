import { Database } from "sqlite";

interface Address {
  id: number;
  customer_id: number;
  type: string;
  street_1: string;
  street_2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: number;
  [key: string]: any;
}

export async function getCustomerByEmail(
  db: Database,
  email: string,
): Promise<any> {
  const query = `
    SELECT
        c.*,
        a.street_1 AS shipping_street,
        a.city AS shipping_city,
        a.state AS shipping_state,
        a.postal_code AS shipping_zip,
        a.country AS shipping_country,
        MAX(o.created_at) as last_order_date
    FROM customers c
    LEFT JOIN addresses a ON c.id = a.customer_id AND a.is_default = 1 AND a.type IN ('shipping', 'both')
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE c.email = ?
    GROUP BY c.id
  `;

  return await db.get(query, [email]);
}

export async function fetchActiveCustomers(
  db: Database,
  daysInactive: number = 90,
): Promise<any[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);
  const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

  const query = `
    SELECT
        c.*,
        COUNT(DISTINCT o.id) as total_order_count,
        AVG(o.total_amount) as average_order_value
    FROM customers c
    INNER JOIN orders o ON c.id = o.customer_id
    WHERE o.created_at >= ?
    GROUP BY c.id
  `;

  return await db.all(query, [cutoffDateStr]);
}

export async function findCustomersBySegment(
  db: Database,
  segmentName: string,
): Promise<any[]> {
  const query = `
    SELECT
        c.id,
        c.email,
        c.phone,
        c.first_name,
        c.last_name,
        COALESCE(SUM(o.total_amount), 0) as total_lifetime_value
    FROM customers c
    INNER JOIN customer_segments cs ON c.id = cs.customer_id
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE cs.segment_name = ?
    GROUP BY c.id
  `;

  return await db.all(query, [segmentName]);
}

export async function getCustomerProfile(
  db: Database,
  customerId: number,
): Promise<any | null> {
  const customerQuery = "SELECT * FROM customers WHERE id = ?";

  const customer = await db.get(customerQuery, [customerId]);

  if (!customer) {
    return null;
  }

  const addressesQuery = `
    SELECT * FROM addresses
    WHERE customer_id = ?
    ORDER BY is_default DESC, id
  `;

  const addresses = (await db.all(addressesQuery, [customerId])) as Address[];

  const orderCountQuery =
    "SELECT COUNT(*) as order_count FROM orders WHERE customer_id = ?";

  const orderCountResult = await db.get(orderCountQuery, [customerId]);

  const orderCount = orderCountResult.order_count;

  const productsQuery = `
    SELECT DISTINCT p.name as product_name
    FROM orders o
    INNER JOIN order_items oi ON o.id = oi.order_id
    INNER JOIN products p ON oi.product_id = p.id
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC
    LIMIT 5
  `;

  const productRows = await db.all(productsQuery, [customerId]);

  const lastProducts = productRows.map((row) => row.product_name);

  const result = {
    ...customer,
    addresses,
    order_count: orderCount,
    last_5_products: lastProducts,
  };

  return result;
}

export async function searchCustomersByName(
  db: Database,
  firstName?: string,
  lastName?: string,
): Promise<any[]> {
  let query = `
    SELECT
        c.*,
        c.status,
        CAST((julianday('now') - julianday(c.created_at)) AS INTEGER) as account_age_days,
        a.city as default_city,
        a.state as default_state
    FROM customers c
    LEFT JOIN addresses a ON c.id = a.customer_id AND a.is_default = 1
    WHERE 1=1
  `;

  const params: string[] = [];

  if (firstName) {
    query += " AND c.first_name LIKE ?";
    params.push(`%${firstName}%`);
  }

  if (lastName) {
    query += " AND c.last_name LIKE ?";
    params.push(`%${lastName}%`);
  }

  return await db.all(query, params);
}

export async function listCustomersWithReviews(db: Database): Promise<any[]> {
  const query = `
    SELECT
        c.*,
        COUNT(r.id) as review_count,
        AVG(r.rating) as average_rating_given
    FROM customers c
    INNER JOIN reviews r ON c.id = r.customer_id
    GROUP BY c.id
    HAVING COUNT(r.id) > 0
  `;

  return await db.all(query);
}

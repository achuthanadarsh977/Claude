import { Database } from "sqlite";

interface Review {
  id: number;
  rating: number;
  comment: string;
  created_at: string;
  [key: string]: any;
}

export async function getProductReviews(
  db: Database,
  productId: number,
  limit: number = 50,
): Promise<Review[]> {
  const query = `
    SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        c.first_name || ' ' || c.last_name as customer_name,
        c.id as customer_id,
        o.created_at as order_date,
        r.is_verified_purchase as verified_purchase,
        (SELECT COUNT(*) FROM reviews r2 WHERE r2.customer_id = c.id) as customer_review_count
    FROM reviews r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN orders o ON o.id = r.order_id
    WHERE r.product_id = ?
    ORDER BY r.created_at DESC
    LIMIT ?
  `;

  const rows = await db.all(query, [productId, limit]);
  return rows as Review[];
}

export async function fetchCustomerReviews(
  db: Database,
  customerId: number,
): Promise<Review[]> {
  const query = `
    SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        p.name as product_name,
        p.id as product_id,
        r.order_id,
        (SELECT AVG(o.total_amount)
         FROM orders o
         WHERE o.customer_id = ?) as customer_avg_order_value
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    WHERE r.customer_id = ?
    ORDER BY r.created_at DESC
  `;

  const rows = await db.all(query, [customerId, customerId]);
  return rows as Review[];
}

export async function findUnverifiedReviews(db: Database): Promise<Review[]> {
  const query = `
    SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        c.email as customer_email,
        c.id as customer_id,
        JULIANDAY('now') - JULIANDAY(c.created_at) as account_age_days
    FROM reviews r
    JOIN customers c ON r.customer_id = c.id
    WHERE r.is_verified_purchase = 0
       OR r.order_id IS NULL
    ORDER BY r.created_at DESC
  `;

  const rows = await db.all(query, []);
  return rows as Review[];
}

export async function getHelpfulReviews(
  db: Database,
  minHelpful: number = 5,
): Promise<Review[]> {
  const query = `
    SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        r.helpful_count,
        c.id as customer_id,
        c.first_name || ' ' || c.last_name as customer_name,
        c.email,
        c.created_at as customer_since,
        p.name as product_name,
        cat.name as product_category,
        CASE
            WHEN COUNT(DISTINCT o.id) >= 10 THEN 'VIP'
            WHEN COUNT(DISTINCT o.id) >= 5 THEN 'Regular'
            WHEN COUNT(DISTINCT o.id) >= 2 THEN 'Returning'
            ELSE 'New'
        END as customer_segment
    FROM reviews r
    JOIN customers c ON r.customer_id = c.id
    JOIN products p ON r.product_id = p.id
    JOIN categories cat ON p.category_id = cat.id
    LEFT JOIN orders o ON o.customer_id = c.id
    WHERE r.helpful_count >= ?
    GROUP BY r.id
    ORDER BY r.helpful_count DESC, r.created_at DESC
  `;

  const rows = await db.all(query, [minHelpful]);
  return rows as Review[];
}

export async function fetchRecentReviews(
  db: Database,
  days: number = 7,
): Promise<Review[]> {
  const query = `
    SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        p.name as product_name,
        p.id as product_id,
        COALESCE(SUM(i.quantity), 0) as product_inventory_status,
        a.city as customer_city,
        a.state as customer_state,
        o.total_amount as order_total
    FROM reviews r
    JOIN customers c ON r.customer_id = c.id
    LEFT JOIN addresses a ON c.id = a.customer_id AND a.is_default = 1
    JOIN products p ON r.product_id = p.id
    LEFT JOIN inventory i ON i.product_id = p.id
    LEFT JOIN orders o ON o.id = r.order_id
    WHERE r.created_at >= date('now', '-' || ? || ' days')
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `;

  const rows = await db.all(query, [days]);
  return rows as Review[];
}

export async function getReviewsByRating(
  db: Database,
  rating: number,
): Promise<Review[]> {
  const query = `
    SELECT
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        p.name as product_name,
        p.price as product_price,
        c.first_name || ' ' || c.last_name as customer_name,
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as customer_order_history_count,
        CASE
            WHEN r.order_id IS NOT NULL THEN
                JULIANDAY(r.created_at) - JULIANDAY(o.created_at)
            ELSE NULL
        END as days_since_purchase
    FROM reviews r
    JOIN customers c ON r.customer_id = c.id
    JOIN products p ON r.product_id = p.id
    LEFT JOIN orders o ON o.id = r.order_id
    WHERE r.rating = ?
    ORDER BY r.created_at DESC
  `;

  const rows = await db.all(query, [rating]);
  return rows as Review[];
}

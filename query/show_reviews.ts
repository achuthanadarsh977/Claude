import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showReviews() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const reviews = await db.all(`
    SELECT r.id, p.name as product,
           c.first_name || ' ' || c.last_name as customer,
           r.rating, r.title, r.helpful_count,
           r.is_verified_purchase as verified,
           r.created_at
    FROM reviews r
    JOIN products p ON r.product_id = p.id
    JOIN customers c ON r.customer_id = c.id
    ORDER BY r.created_at DESC
  `);

  console.table(reviews);
  await db.close();
}

showReviews();

import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showOrderPromos() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const promos = await db.all(`
    SELECT op.id, o.order_number,
           c.first_name || ' ' || c.last_name as customer,
           p.code as promo_code, p.description,
           op.discount_applied, o.total_amount,
           op.created_at
    FROM order_promotions op
    JOIN orders o ON op.order_id = o.id
    JOIN customers c ON o.customer_id = c.id
    JOIN promotions p ON op.promotion_id = p.id
    ORDER BY op.created_at DESC
  `);

  console.table(promos);
  await db.close();
}

showOrderPromos();

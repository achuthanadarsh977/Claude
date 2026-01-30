import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showPromotions() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const promos = await db.all(`
    SELECT id, code, description, discount_type, discount_value,
           minimum_order_amount as min_order, usage_limit, usage_count,
           max_uses_per_customer as per_customer,
           start_date, end_date, is_active
    FROM promotions
    ORDER BY id
  `);

  console.table(promos);
  await db.close();
}

showPromotions();

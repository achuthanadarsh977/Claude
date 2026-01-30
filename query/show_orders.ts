import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showOrders() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const orders = await db.all(`
    SELECT o.id, o.order_number, c.first_name || ' ' || c.last_name as customer,
           o.status, o.total_amount, o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
  `);

  console.table(orders);
  await db.close();
}

showOrders();

import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showWarehouses() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const warehouses = await db.all(`
    SELECT w.id, w.code, w.name, w.city, w.state, w.is_active,
           COUNT(DISTINCT i.product_id) as products,
           SUM(i.quantity) as total_units,
           SUM(i.quantity * p.price) as inventory_value
    FROM warehouses w
    LEFT JOIN inventory i ON w.id = i.warehouse_id
    LEFT JOIN products p ON i.product_id = p.id
    GROUP BY w.id
    ORDER BY inventory_value DESC
  `);

  console.table(warehouses);
  await db.close();
}

showWarehouses();

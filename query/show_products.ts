import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showProducts() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const products = await db.all(`
    SELECT p.id, p.sku, p.name, c.name as category, p.price, p.cost, p.is_active
    FROM products p
    JOIN categories c ON p.category_id = c.id
  `);

  console.table(products);
  await db.close();
}

showProducts();

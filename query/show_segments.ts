import { open } from "sqlite";
import sqlite3 from "sqlite3";

async function showSegments() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  const segments = await db.all(`
    SELECT cs.id,
           c.first_name || ' ' || c.last_name as customer,
           cs.segment_name, cs.value_score,
           cs.assigned_at, cs.expires_at
    FROM customer_segments cs
    JOIN customers c ON cs.customer_id = c.id
    ORDER BY cs.value_score DESC
  `);

  console.table(segments);
  await db.close();
}

showSegments();

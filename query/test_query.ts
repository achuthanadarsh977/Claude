import { open } from "sqlite";
import sqlite3 from "sqlite3";
import { getCustomerProfile } from "./queries/customer_queries";
import { fetchCustomerOrders } from "./queries/order_queries";
import { getProductReviews } from "./queries/review_queries";
import { getUnshippedOrders } from "./queries/shipping_queries";
import { getInventoryValueByWarehouse } from "./queries/inventory_queries";

async function testQueries() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  console.log("=== Testing Customer Profile (customer_id: 1 - John Doe) ===\n");
  const profile = await getCustomerProfile(db, 1);
  console.log(profile);

  console.log("\n=== Testing Customer Orders (customer_id: 1) ===\n");
  const customerOrders = await fetchCustomerOrders(db, 1);
  console.table(customerOrders);

  console.log(
    "\n=== Testing Product Reviews (product_id: 1 - Smartphone Pro X) ===\n",
  );
  const reviews = await getProductReviews(db, 1);
  console.table(reviews);

  console.log("\n=== Testing Unshipped Orders ===\n");
  const unshipped = await getUnshippedOrders(db);
  console.table(unshipped);

  console.log("\n=== Testing Inventory Value by Warehouse ===\n");
  const inventoryValue = await getInventoryValueByWarehouse(db);
  console.table(inventoryValue);

  await db.close();
}

testQueries();

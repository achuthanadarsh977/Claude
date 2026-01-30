import { open } from "sqlite";
import sqlite3 from "sqlite3";
import {
  getActivePromotions,
  checkPromoEligibility,
  findUnusedPromotions,
  getPromotionPerformance,
} from "./queries/promotion_queries";

async function testPromoQueries() {
  const db = await open({
    filename: "ecommerce.db",
    driver: sqlite3.Database,
  });

  console.log(
    "=== Testing Promo Eligibility (customer 1, code: WELCOME10) ===\n",
  );
  try {
    const eligibility = await checkPromoEligibility(db, 1, "WELCOME10");
    console.log(eligibility);
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  console.log("\n=== Testing Promotion Performance (promo_id: 1) ===\n");
  try {
    const performance = await getPromotionPerformance(db, 1);
    console.log(performance);
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  console.log("\n=== Testing Find Unused Promotions ===\n");
  try {
    const unused = await findUnusedPromotions(db);
    console.table(unused);
  } catch (err: any) {
    console.error("Error:", err.message);
  }

  // List all promotions for reference
  console.log("\n=== All Promotions (for reference) ===\n");
  const allPromos = await db.all(`
    SELECT id, code, description, discount_type, discount_value,
           minimum_order_amount, usage_limit, usage_count, start_date, end_date, is_active
    FROM promotions
  `);
  console.table(allPromos);

  await db.close();
}

testPromoQueries();

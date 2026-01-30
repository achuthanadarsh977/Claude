import { Database } from "sqlite";

interface CustomerLifetimeValue {
  customer_id: number;
  email: string;
  total_spent: number;
  order_count: number;
  average_order_value: number;
  days_as_customer: number;
  customer_since: string;
  preferred_categories: Array<{
    category: string;
    purchase_count: number;
    total_quantity: number;
  }>;
}

interface CategorySales {
  category_id: number;
  category_name: string;
  total_sales: number;
  product_count: number;
  total_quantity_sold: number;
  order_item_count: number;
  top_product: {
    name: string | null;
    sku: string | null;
    quantity_sold: number;
    sales: number;
  };
  customer_segment_breakdown: Array<{
    segment: string;
    customer_count: number;
    sales: number;
  }>;
}

interface RepeatCustomer {
  customer_id: number;
  email: string;
  order_count: number;
  total_spent: number;
  first_order_date: string;
  last_order_date: string;
  average_days_between_orders: number;
  favorite_category: string;
}

interface ProductPerformance {
  product_id: number;
  name: string;
  sku: string;
  category: string;
  current_price: number;
  sales_data: {
    times_ordered: number;
    total_quantity_sold: number;
    total_revenue: number;
    unique_customers: number;
    average_selling_price: number;
  };
  review_metrics: {
    review_count: number;
    average_rating: number;
    positive_reviews: number;
    negative_reviews: number;
  };
  inventory: {
    current_stock: number;
    warehouse_count: number;
    turnover_rate_annual: number;
  };
  customer_segments: Array<{
    segment: string;
    customer_count: number;
    quantity_purchased: number;
    revenue: number;
  }>;
  return_rate_estimate: number;
}

interface SegmentMetrics {
  segment: string;
  customer_count: number;
  total_orders: number;
  total_revenue: number;
  average_order_value: number;
  orders_per_customer: number;
  average_customer_value: number;
  top_products: Array<{
    product_id: number;
    name: string;
    sku: string;
    category: string;
    order_count: number;
    quantity_sold: number;
    revenue: number;
  }>;
  preferred_shipping_states: Array<{
    state: string;
    order_count: number;
    customer_count: number;
    revenue: number;
  }>;
}

interface TrendingProduct {
  product_id: number;
  name: string;
  sku: string;
  category: string;
  growth_rate: number;
  first_half_quantity: number;
  second_half_quantity: number;
  total_orders: number;
  total_revenue: number;
  current_inventory: number;
  new_customers: number;
  repeat_customers: number;
  new_customer_ratio: number;
  repeat_customer_ratio: number;
}

export async function calculateCustomerLifetimeValue(
  db: Database,
  customerId: number,
): Promise<CustomerLifetimeValue | {}> {
  const query = `
    SELECT
        c.id,
        c.email,
        c.created_at,
        COUNT(DISTINCT o.id) as order_count,
        COALESCE(SUM(o.total_amount), 0) as total_spent,
        COALESCE(AVG(o.total_amount), 0) as average_order_value,
        julianday('now') - julianday(c.created_at) as days_as_customer
    FROM customers c
    LEFT JOIN orders o ON c.id = o.customer_id
    WHERE c.id = ?
    GROUP BY c.id
    `;

  const result: any = await db.get(query, [customerId]);
  if (!result) return {};

  const categoryQuery = `
      SELECT
          cat.name as category_name,
          COUNT(DISTINCT oi.id) as purchase_count,
          SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN categories cat ON p.category_id = cat.id
      WHERE o.customer_id = ?
      GROUP BY cat.id, cat.name
      ORDER BY purchase_count DESC
      LIMIT 5
      `;

  const categories: any[] = await db.all(categoryQuery, [customerId]);

  return {
    customer_id: result.id,
    email: result.email,
    total_spent: parseFloat(result.total_spent),
    order_count: result.order_count,
    average_order_value: parseFloat(result.average_order_value),
    days_as_customer: Math.floor(result.days_as_customer),
    customer_since: result.created_at,
    preferred_categories: categories.map((row) => ({
      category: row.category_name,
      purchase_count: row.purchase_count,
      total_quantity: row.total_quantity,
    })),
  };
}

export async function getSalesByCategory(
  db: Database,
  startDate: string,
  endDate: string,
): Promise<CategorySales[]> {
  const query = `
    SELECT
        cat.id as category_id,
        cat.name as category_name,
        COUNT(DISTINCT p.id) as product_count,
        COUNT(DISTINCT oi.id) as order_item_count,
        SUM(oi.quantity) as total_quantity_sold,
        SUM(oi.unit_price * oi.quantity) as total_sales
    FROM categories cat
    JOIN products p ON cat.id = p.category_id
    JOIN order_items oi ON p.id = oi.product_id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.created_at BETWEEN ? AND ?
    GROUP BY cat.id, cat.name
    ORDER BY total_sales DESC
    `;

  const categories: any[] = await db.all(query, [startDate, endDate]);
  const results: CategorySales[] = [];

  for (const category of categories) {
    const topProduct: any = await db.get(
      `SELECT p.name as product_name, p.sku, SUM(oi.quantity) as quantity_sold,
              SUM(oi.unit_price * oi.quantity) as product_sales
       FROM products p JOIN order_items oi ON p.id = oi.product_id
       JOIN orders o ON oi.order_id = o.id
       WHERE p.category_id = ? AND o.created_at BETWEEN ? AND ?
       GROUP BY p.id ORDER BY product_sales DESC LIMIT 1`,
      [category.category_id, startDate, endDate],
    );

    const segments: any[] = await db.all(
      `SELECT COALESCE(cs.segment_name, 'Unknown') as segment,
              COUNT(DISTINCT c.id) as customer_count,
              SUM(oi.unit_price * oi.quantity) as segment_sales
       FROM customers c JOIN orders o ON c.id = o.customer_id
       JOIN order_items oi ON o.id = oi.order_id JOIN products p ON oi.product_id = p.id
       LEFT JOIN customer_segments cs ON c.id = cs.customer_id
       WHERE p.category_id = ? AND o.created_at BETWEEN ? AND ?
       GROUP BY cs.segment_name ORDER BY segment_sales DESC`,
      [category.category_id, startDate, endDate],
    );

    results.push({
      category_id: category.category_id,
      category_name: category.category_name,
      total_sales: parseFloat(category.total_sales),
      product_count: category.product_count,
      total_quantity_sold: category.total_quantity_sold,
      order_item_count: category.order_item_count,
      top_product: {
        name: topProduct?.product_name || null,
        sku: topProduct?.sku || null,
        quantity_sold: topProduct?.quantity_sold || 0,
        sales: topProduct ? parseFloat(topProduct.product_sales) : 0,
      },
      customer_segment_breakdown: segments.map((row) => ({
        segment: row.segment,
        customer_count: row.customer_count,
        sales: parseFloat(row.segment_sales),
      })),
    });
  }

  return results;
}

export async function findRepeatCustomers(
  db: Database,
  minOrders: number = 2,
): Promise<RepeatCustomer[]> {
  const query = `
    WITH customer_orders AS (
        SELECT c.id as customer_id, c.email, COUNT(DISTINCT o.id) as order_count,
               SUM(o.total_amount) as total_spent, MIN(o.created_at) as first_order_date,
               MAX(o.created_at) as last_order_date, GROUP_CONCAT(o.created_at) as order_dates
        FROM customers c JOIN orders o ON c.id = o.customer_id
        GROUP BY c.id, c.email HAVING COUNT(DISTINCT o.id) >= ?
    ),
    customer_categories AS (
        SELECT o.customer_id, cat.name as category_name, COUNT(DISTINCT oi.id) as purchase_count,
               ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY COUNT(DISTINCT oi.id) DESC) as rn
        FROM orders o JOIN order_items oi ON o.id = oi.order_id
        JOIN products p ON oi.product_id = p.id JOIN categories cat ON p.category_id = cat.id
        GROUP BY o.customer_id, cat.id, cat.name
    )
    SELECT co.*, cc.category_name as favorite_category
    FROM customer_orders co
    LEFT JOIN customer_categories cc ON co.customer_id = cc.customer_id AND cc.rn = 1
    ORDER BY co.total_spent DESC
    `;

  const customers: any[] = await db.all(query, [minOrders]);

  return customers.map((customer) => {
    const orderDates = customer.order_dates.split(",");
    let avgDaysBetween = 0;
    if (orderDates.length > 1) {
      const dates = orderDates
        .map((d: string) => new Date(d))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());
      avgDaysBetween =
        (dates[dates.length - 1].getTime() - dates[0].getTime()) /
        (1000 * 60 * 60 * 24) /
        (dates.length - 1);
    }
    return {
      customer_id: customer.customer_id,
      email: customer.email,
      order_count: customer.order_count,
      total_spent: parseFloat(customer.total_spent),
      first_order_date: customer.first_order_date,
      last_order_date: customer.last_order_date,
      average_days_between_orders: Math.round(avgDaysBetween * 10) / 10,
      favorite_category: customer.favorite_category || "Unknown",
    };
  });
}

export async function getProductPerformance(
  db: Database,
  productId: number,
): Promise<ProductPerformance | {}> {
  const product: any = await db.get(
    `SELECT p.id, p.name, p.sku, p.price, cat.name as category_name,
            COUNT(DISTINCT oi.id) as times_ordered, SUM(oi.quantity) as total_quantity_sold,
            SUM(oi.unit_price * oi.quantity) as total_revenue, COUNT(DISTINCT o.customer_id) as unique_customers,
            AVG(oi.unit_price) as average_selling_price
     FROM products p JOIN categories cat ON p.category_id = cat.id
     LEFT JOIN order_items oi ON p.id = oi.product_id LEFT JOIN orders o ON oi.order_id = o.id
     WHERE p.id = ? GROUP BY p.id`,
    [productId],
  );
  if (!product) return {};

  const reviews: any = await db.get(
    `SELECT COUNT(*) as review_count, AVG(rating) as average_rating,
            SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive_reviews,
            SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative_reviews
     FROM reviews WHERE product_id = ?`,
    [productId],
  );

  const inventory: any = await db.get(
    `SELECT SUM(quantity) as current_stock, COUNT(DISTINCT warehouse_id) as warehouse_count
     FROM inventory WHERE product_id = ?`,
    [productId],
  );

  const turnover: any = await db.get(
    `SELECT SUM(oi.quantity) as quantity_sold_90d FROM order_items oi
     JOIN orders o ON oi.order_id = o.id WHERE oi.product_id = ? AND o.created_at >= date('now', '-90 days')`,
    [productId],
  );

  const segments: any[] = await db.all(
    `SELECT COALESCE(cs.segment_name, 'Unknown') as segment, COUNT(DISTINCT c.id) as customer_count,
            SUM(oi.quantity) as quantity_purchased, SUM(oi.unit_price * oi.quantity) as segment_revenue
     FROM customers c JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id
     LEFT JOIN customer_segments cs ON c.id = cs.customer_id WHERE oi.product_id = ?
     GROUP BY cs.segment_name ORDER BY segment_revenue DESC`,
    [productId],
  );

  const currentStock = inventory?.current_stock || 0;
  const sold90d = turnover?.quantity_sold_90d || 0;
  const inventoryTurnover =
    currentStock > 0 ? ((sold90d / 90) * 365) / currentStock : 0;

  return {
    product_id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category_name,
    current_price: parseFloat(product.price),
    sales_data: {
      times_ordered: product.times_ordered,
      total_quantity_sold: product.total_quantity_sold,
      total_revenue: parseFloat(product.total_revenue || 0),
      unique_customers: product.unique_customers,
      average_selling_price: parseFloat(product.average_selling_price || 0),
    },
    review_metrics: {
      review_count: reviews?.review_count || 0,
      average_rating: Math.round((reviews?.average_rating || 0) * 100) / 100,
      positive_reviews: reviews?.positive_reviews || 0,
      negative_reviews: reviews?.negative_reviews || 0,
    },
    inventory: {
      current_stock: currentStock,
      warehouse_count: inventory?.warehouse_count || 0,
      turnover_rate_annual: Math.round(inventoryTurnover * 100) / 100,
    },
    customer_segments: segments.map((row) => ({
      segment: row.segment,
      customer_count: row.customer_count,
      quantity_purchased: row.quantity_purchased,
      revenue: parseFloat(row.segment_revenue),
    })),
    return_rate_estimate:
      reviews?.review_count > 0
        ? Math.round((reviews.negative_reviews / reviews.review_count) * 1000) /
          10
        : 0,
  };
}

export async function calculateSegmentMetrics(
  db: Database,
  segmentName: string,
): Promise<SegmentMetrics | { segment: string; customer_count: number }> {
  const stats: any = await db.get(
    `SELECT COUNT(DISTINCT c.id) as customer_count, COUNT(DISTINCT o.id) as total_orders,
            SUM(o.total_amount) as total_revenue, AVG(o.total_amount) as average_order_value,
            COUNT(DISTINCT o.id) * 1.0 / COUNT(DISTINCT c.id) as orders_per_customer
     FROM customers c JOIN customer_segments cs ON c.id = cs.customer_id
     LEFT JOIN orders o ON c.id = o.customer_id WHERE cs.segment_name = ?`,
    [segmentName],
  );

  if (!stats || stats.customer_count === 0)
    return { segment: segmentName, customer_count: 0 };

  const topProducts: any[] = await db.all(
    `SELECT p.id, p.name, p.sku, cat.name as category_name, COUNT(DISTINCT oi.id) as order_count,
            SUM(oi.quantity) as quantity_sold, SUM(oi.unit_price * oi.quantity) as product_revenue
     FROM customers c JOIN customer_segments cs ON c.id = cs.customer_id
     JOIN orders o ON c.id = o.customer_id JOIN order_items oi ON o.id = oi.order_id
     JOIN products p ON oi.product_id = p.id JOIN categories cat ON p.category_id = cat.id
     WHERE cs.segment_name = ? GROUP BY p.id ORDER BY product_revenue DESC LIMIT 10`,
    [segmentName],
  );

  const shippingStates: any[] = await db.all(
    `SELECT a.state as shipping_state, COUNT(DISTINCT o.id) as order_count,
            COUNT(DISTINCT c.id) as customer_count, SUM(o.total_amount) as state_revenue
     FROM customers c JOIN customer_segments cs ON c.id = cs.customer_id
     JOIN orders o ON c.id = o.customer_id LEFT JOIN addresses a ON o.shipping_address_id = a.id
     WHERE cs.segment_name = ? AND a.state IS NOT NULL
     GROUP BY a.state ORDER BY order_count DESC LIMIT 5`,
    [segmentName],
  );

  return {
    segment: segmentName,
    customer_count: stats.customer_count,
    total_orders: stats.total_orders || 0,
    total_revenue: parseFloat(stats.total_revenue || 0),
    average_order_value: parseFloat(stats.average_order_value || 0),
    orders_per_customer:
      Math.round((stats.orders_per_customer || 0) * 100) / 100,
    average_customer_value:
      Math.round((stats.total_revenue / stats.customer_count) * 100) / 100,
    top_products: topProducts.map((row) => ({
      product_id: row.id,
      name: row.name,
      sku: row.sku,
      category: row.category_name,
      order_count: row.order_count,
      quantity_sold: row.quantity_sold,
      revenue: parseFloat(row.product_revenue),
    })),
    preferred_shipping_states: shippingStates.map((row) => ({
      state: row.shipping_state,
      order_count: row.order_count,
      customer_count: row.customer_count,
      revenue: parseFloat(row.state_revenue),
    })),
  };
}

export async function findTrendingProducts(
  db: Database,
  days: number = 30,
): Promise<TrendingProduct[]> {
  const midpoint = Math.floor(days / 2);
  const products: any[] = await db.all(
    `WITH period_sales AS (
        SELECT p.id as product_id, p.name as product_name, p.sku, cat.name as category_name,
               SUM(CASE WHEN o.created_at >= date('now', '-' || ? || ' days') AND o.created_at < date('now', '-' || ? || ' days') THEN oi.quantity ELSE 0 END) as first_half_quantity,
               SUM(CASE WHEN o.created_at >= date('now', '-' || ? || ' days') THEN oi.quantity ELSE 0 END) as second_half_quantity,
               COUNT(DISTINCT CASE WHEN o.created_at >= date('now', '-' || ? || ' days') THEN o.id END) as total_orders,
               SUM(CASE WHEN o.created_at >= date('now', '-' || ? || ' days') THEN oi.unit_price * oi.quantity ELSE 0 END) as total_revenue
        FROM products p JOIN categories cat ON p.category_id = cat.id
        JOIN order_items oi ON p.id = oi.product_id JOIN orders o ON oi.order_id = o.id
        GROUP BY p.id HAVING first_half_quantity > 0
    ),
    inventory_data AS (SELECT product_id, SUM(quantity) as current_inventory FROM inventory GROUP BY product_id),
    customer_data AS (
        SELECT oi.product_id, COUNT(DISTINCT CASE WHEN customer_order_num = 1 THEN o.customer_id END) as new_customers,
               COUNT(DISTINCT CASE WHEN customer_order_num > 1 THEN o.customer_id END) as repeat_customers
        FROM order_items oi JOIN orders o ON oi.order_id = o.id
        JOIN (SELECT customer_id, id as order_id, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at) as customer_order_num FROM orders) ord_nums ON o.id = ord_nums.order_id
        WHERE o.created_at >= date('now', '-' || ? || ' days') GROUP BY oi.product_id
    )
    SELECT ps.*, COALESCE(id.current_inventory, 0) as current_inventory, COALESCE(cd.new_customers, 0) as new_customers, COALESCE(cd.repeat_customers, 0) as repeat_customers,
           (ps.second_half_quantity - ps.first_half_quantity) * 100.0 / ps.first_half_quantity as growth_rate
    FROM period_sales ps LEFT JOIN inventory_data id ON ps.product_id = id.product_id LEFT JOIN customer_data cd ON ps.product_id = cd.product_id
    WHERE ps.second_half_quantity > ps.first_half_quantity ORDER BY growth_rate DESC`,
    [days, midpoint, midpoint, days, days, days],
  );

  return products.map((p) => {
    const totalCustomers = p.new_customers + p.repeat_customers;
    const newCustomerRatio =
      totalCustomers > 0 ? p.new_customers / totalCustomers : 0;
    return {
      product_id: p.product_id,
      name: p.product_name,
      sku: p.sku,
      category: p.category_name,
      growth_rate: Math.round(p.growth_rate * 10) / 10,
      first_half_quantity: p.first_half_quantity,
      second_half_quantity: p.second_half_quantity,
      total_orders: p.total_orders,
      total_revenue: parseFloat(p.total_revenue),
      current_inventory: p.current_inventory,
      new_customers: p.new_customers,
      repeat_customers: p.repeat_customers,
      new_customer_ratio: Math.round(newCustomerRatio * 100) / 100,
      repeat_customer_ratio: Math.round((1 - newCustomerRatio) * 100) / 100,
    };
  });
}

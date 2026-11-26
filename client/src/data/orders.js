// Demo order data for ShopSphere (dummy transactions for presentation).
// Orders are stored in the browser (localStorage) so status changes and
// newly created orders survive a page refresh. Nothing is sent to the server.

export const ORDER_STATUSES = [
  "Pending",
  "Processing",
  "Shipped",
  "Delivered",
  "Cancelled",
];

export const PAYMENT_METHODS = ["UPI", "Credit Card", "Debit Card", "Net Banking", "Cash on Delivery"];

export const CATALOG = [
  { sku: "ELE-101", name: "Wireless Bluetooth Earbuds", category: "Electronics", price: 1999 },
  { sku: "ELE-102", name: "Smart Watch Series 5", category: "Electronics", price: 4499 },
  { sku: "ELE-103", name: "20000mAh Power Bank", category: "Electronics", price: 1599 },
  { sku: "ELE-104", name: "USB-C Fast Charger 65W", category: "Electronics", price: 1299 },
  { sku: "ACC-201", name: "Laptop Backpack 30L", category: "Accessories", price: 1799 },
  { sku: "ACC-202", name: "Ergonomic Wireless Mouse", category: "Accessories", price: 899 },
  { sku: "ACC-203", name: "Mechanical Keyboard", category: "Accessories", price: 3299 },
  { sku: "HOM-301", name: "Stainless Steel Water Bottle", category: "Home & Kitchen", price: 549 },
  { sku: "HOM-302", name: "Non-stick Cookware Set", category: "Home & Kitchen", price: 2799 },
  { sku: "HOM-303", name: "LED Desk Lamp", category: "Home & Kitchen", price: 799 },
  { sku: "FSH-401", name: "Cotton Casual T-Shirt", category: "Fashion", price: 699 },
  { sku: "FSH-402", name: "Running Shoes", category: "Fashion", price: 2999 },
  { sku: "GRO-501", name: "Organic Green Tea (100 bags)", category: "Grocery", price: 349 },
  { sku: "GRO-502", name: "Premium Almonds 1kg", category: "Grocery", price: 799 },
];

const byName = Object.fromEntries(CATALOG.map((p) => [p.name, p]));

// [customer, city, daysAgo, hour, status, payment, [[product, qty], ...]]
const SEED = [
  ["Aarav Sharma", "Mumbai", 0, 10, "Pending", "UPI", [["Wireless Bluetooth Earbuds", 1], ["USB-C Fast Charger 65W", 1]]],
  ["Priya Nair", "Bengaluru", 0, 14, "Processing", "Credit Card", [["Smart Watch Series 5", 1]]],
  ["Rohan Mehta", "Pune", 1, 9, "Processing", "UPI", [["Mechanical Keyboard", 1], ["Ergonomic Wireless Mouse", 1]]],
  ["Ananya Iyer", "Chennai", 1, 17, "Shipped", "Debit Card", [["Running Shoes", 1], ["Cotton Casual T-Shirt", 2]]],
  ["Vikram Singh", "Delhi", 2, 11, "Shipped", "Net Banking", [["Non-stick Cookware Set", 1]]],
  ["Neha Kapoor", "Jaipur", 2, 16, "Delivered", "UPI", [["Premium Almonds 1kg", 2], ["Organic Green Tea (100 bags)", 3]]],
  ["Karthik Reddy", "Hyderabad", 3, 12, "Delivered", "Credit Card", [["20000mAh Power Bank", 2]]],
  ["Sneha Patil", "Nagpur", 3, 19, "Cancelled", "UPI", [["Smart Watch Series 5", 1]]],
  ["Arjun Verma", "Lucknow", 4, 10, "Delivered", "Cash on Delivery", [["Laptop Backpack 30L", 1], ["Stainless Steel Water Bottle", 2]]],
  ["Meera Joshi", "Ahmedabad", 5, 13, "Delivered", "UPI", [["LED Desk Lamp", 2]]],
  ["Rahul Gupta", "Kolkata", 5, 18, "Delivered", "Debit Card", [["Wireless Bluetooth Earbuds", 2]]],
  ["Divya Menon", "Kochi", 6, 9, "Delivered", "Credit Card", [["Running Shoes", 2]]],
  ["Siddharth Rao", "Mysuru", 7, 15, "Delivered", "UPI", [["Mechanical Keyboard", 1]]],
  ["Pooja Bansal", "Chandigarh", 8, 11, "Cancelled", "Net Banking", [["Non-stick Cookware Set", 2]]],
  ["Aditya Kulkarni", "Pune", 9, 20, "Delivered", "UPI", [["USB-C Fast Charger 65W", 3], ["20000mAh Power Bank", 1]]],
  ["Ishita Das", "Kolkata", 10, 12, "Delivered", "Cash on Delivery", [["Cotton Casual T-Shirt", 4]]],
  ["Manish Tiwari", "Bhopal", 11, 10, "Delivered", "Debit Card", [["Premium Almonds 1kg", 3]]],
  ["Kavya Srinivasan", "Coimbatore", 12, 16, "Delivered", "UPI", [["Smart Watch Series 5", 1], ["Laptop Backpack 30L", 1]]],
  ["Harsh Agarwal", "Surat", 14, 14, "Delivered", "Credit Card", [["Ergonomic Wireless Mouse", 2], ["Mechanical Keyboard", 1]]],
  ["Tanvi Shah", "Mumbai", 15, 9, "Delivered", "UPI", [["Stainless Steel Water Bottle", 3]]],
  ["Nikhil Choudhary", "Indore", 17, 17, "Delivered", "Net Banking", [["Wireless Bluetooth Earbuds", 1]]],
  ["Riya Malhotra", "Delhi", 19, 11, "Delivered", "UPI", [["Organic Green Tea (100 bags)", 5]]],
  ["Gaurav Saxena", "Noida", 22, 13, "Delivered", "Credit Card", [["Non-stick Cookware Set", 1], ["LED Desk Lamp", 1]]],
  ["Shreya Banerjee", "Kolkata", 26, 10, "Delivered", "Debit Card", [["Running Shoes", 1]]],
];

function buildSeedOrders() {
  const now = new Date();

  return SEED.map(([customer, city, daysAgo, hour, status, payment, lines], index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - daysAgo);
    date.setHours(hour, (index * 17) % 60, 0, 0);

    const items = lines.map(([name, quantity]) => {
      const product = byName[name];
      return { sku: product.sku, name, category: product.category, price: product.price, quantity };
    });

    return {
      id: `SS-${String(1001 + SEED.length - 1 - index)}`,
      customer,
      city,
      date: date.toISOString(),
      status,
      payment,
      paymentStatus:
        status === "Cancelled"
          ? "Refunded"
          : payment === "Cash on Delivery" && status !== "Delivered"
            ? "Pending"
            : status === "Pending"
              ? "Pending"
              : "Paid",
      items,
    };
  });
}

export const getOrderTotal = (order) =>
  order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

export const getItemCount = (order) =>
  order.items.reduce((sum, item) => sum + item.quantity, 0);

const STORAGE_KEY = "shopsphere.orders.v1";

export function loadOrders() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // fall through to seed data
  }
  return buildSeedOrders();
}

export function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch {
    // storage unavailable; orders stay in memory only
  }
}

export function resetOrders() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return buildSeedOrders();
}

export const formatINR = (amount) =>
  Number(amount).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export function summarize(orders) {
  const live = orders.filter((o) => o.status !== "Cancelled");
  const revenue = live.reduce((sum, o) => sum + getOrderTotal(o), 0);
  return {
    total: orders.length,
    revenue,
    open: orders.filter((o) => o.status === "Pending" || o.status === "Processing").length,
    avg: live.length ? revenue / live.length : 0,
  };
}

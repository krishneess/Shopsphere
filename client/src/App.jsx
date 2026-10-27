
import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Inventory from "./pages/Inventory";
import Functions from "./pages/Functions";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    setProductError("");

    try {
      const response = await axios.get(
        "http://localhost:5000/api/products"
      );

      setProducts(response.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductError("Unable to load inventory data.");
    } finally {
      setLoadingProducts(false);
    }
  };

  const totalProducts = products.length;

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) * Number(product.stock || 0),
    0
  );

  // Keep the dashboard threshold consistent with the inventory page:
  // stock from 1 to 5 is low; zero stock is out of stock.
  const lowStockItems = products.filter(
    (product) =>
      Number(product.stock || 0) > 0 &&
      Number(product.stock || 0) <= 5
  ).length;

  const outOfStockItems = products.filter(
    (product) => Number(product.stock || 0) === 0
  ).length;

  const navigation = [
    { name: "Dashboard", icon: "▦" },
    { name: "Inventory", icon: "📦" },
    { name: "Orders", icon: "🧾" },
    { name: "Functions", icon: "ƒ" },
  ];

  const formatCurrency = (amount) =>
    amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    });

  return (
    <div className={`app-shell ${darkMode ? "dark-mode" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">S</span>
          <span>ShopSphere</span>
        </div>

        <p className="nav-heading">WORKSPACE</p>

        {navigation.map((item) => (
          <button
            key={item.name}
            className={`nav-link-custom ${
              activePage === item.name ? "active" : ""
            }`}
            onClick={() => setActivePage(item.name)}
          >
            <span>{item.icon}</span>
            {item.name}
          </button>
        ))}

        <div className="sidebar-bottom">
          <div className="avatar">KR</div>
          <div>
            <strong>Store Manager</strong>
            <small>Administrator</small>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace / </span>
            <strong>{activePage}</strong>
          </div>

          <div className="topbar-actions">
            <div className="connection-status">
              <span className="status-dot"></span>
              Store Management
            </div>

            <button
              className="theme-toggle"
              onClick={() => setDarkMode((current) => !current)}
              aria-label={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={
                darkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {darkMode ? "☀️ Light" : "🌙 Dark"}
            </button>
          </div>
        </header>

        <section className="page-content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">RETAIL MANAGEMENT</p>

              <h1>
                {activePage === "Dashboard"
                  ? "Good day, Manager 👋"
                  : activePage}
              </h1>

              <p className="subtitle">
                Manage your store operations from one place.
              </p>
            </div>

            <span className="date-label">ShopSphere Workspace</span>
          </div>

          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <>
              {productError && (
                <div className="alert alert-warning" role="alert">
                  {productError} Check that the backend server is running.
                  <button
                    className="btn btn-sm btn-outline-dark ms-3"
                    onClick={fetchProducts}
                  >
                    Retry
                  </button>
                </div>
              )}

              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-icon purple">▦</span>
                  <p>Total Products</p>
                  <h2>
                    {loadingProducts ? "..." : totalProducts}
                  </h2>
                  <small>Products in your inventory</small>
                </div>

                <div className="stat-card">
                  <span className="stat-icon green">₹</span>
                  <p>Inventory Value</p>
                  <h2>
                    {loadingProducts
                      ? "..."
                      : formatCurrency(inventoryValue)}
                  </h2>
                  <small>Price multiplied by available stock</small>
                </div>

                <div className="stat-card">
                  <span className="stat-icon orange">!</span>
                  <p>Low Stock Items</p>
                  <h2>
                    {loadingProducts ? "..." : lowStockItems}
                  </h2>
                  <small>Products with 1–5 units remaining</small>
                </div>

                <div className="stat-card">
                  <span className="stat-icon blue">↗</span>
                  <p>Out of Stock</p>
                  <h2>
                    {loadingProducts ? "..." : outOfStockItems}
                  </h2>
                  <small>Products with zero units available</small>
                </div>
              </div>

              <div className="content-card">
                <div className="section-heading">
                  <div>
                    <h3>Inventory Overview</h3>
                    <p>Your store inventory at a glance.</p>
                  </div>

                  <button
                    className="primary-button"
                    onClick={() => setActivePage("Inventory")}
                  >
                    View Inventory →
                  </button>
                </div>

                {loadingProducts ? (
                  <div className="empty-state">
                    <p>Loading inventory data...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📦</div>
                    <h4>Your inventory workspace</h4>
                    <p>
                      Add your first product to start tracking stock
                      and inventory value.
                    </p>

                    <button
                      className="primary-button"
                      onClick={() => setActivePage("Inventory")}
                    >
                      Open Inventory
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table align-middle">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Category</th>
                          <th>Price</th>
                          <th>Stock</th>
                          <th>Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {products.slice(0, 5).map((product) => {
                          const stock = Number(product.stock || 0);
                          const status =
                            stock === 0
                              ? "Out of stock"
                              : stock <= 5
                                ? "Low stock"
                                : "In stock";

                          return (
                            <tr key={product._id}>
                              <td>
                                <strong>{product.name}</strong>
                              </td>
                              <td>{product.category}</td>
                              <td>{formatCurrency(Number(product.price || 0))}</td>
                              <td>{stock}</td>
                              <td>
                                <span
                                  className={`stock-status ${
                                    stock === 0
                                      ? "out-of-stock"
                                      : stock <= 5
                                        ? "low-stock"
                                        : "in-stock"
                                  }`}
                                >
                                  {status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    <button
                      className="primary-button"
                      onClick={() => setActivePage("Inventory")}
                    >
                      Manage All Products →
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* INVENTORY */}
          {activePage === "Inventory" && <Inventory />}

{/* ORDERS PLACEHOLDER */}
{activePage === "Orders" && (
  <div className="content-card page-placeholder">
    <div className="empty-icon">🧾</div>
    <h3>Orders</h3>
    <p>Order management will be implemented next.</p>

    <button
      className="primary-button"
      onClick={() => setActivePage("Dashboard")}
    >
      Back to Dashboard
    </button>
  </div>
)}

{/* FUNCTIONS — ANALYTICS & INTELLIGENCE LAB */}
{activePage === "Functions" && <Functions />}
        </section>
      </main>
    </div>
  );
}

export default App;

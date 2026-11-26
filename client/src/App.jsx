
import { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import Inventory from "./pages/Inventory";
import Functions from "./pages/Functions";
import AccountManagement from "./pages/AccountManagement";
import Orders from "./pages/Orders";
import Dashboard from "./pages/Dashboard";

const API_BASE = "http://localhost:5000/api";

function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [darkMode, setDarkMode] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  async function fetchProducts() {
    try {
      const response = await fetch(`${API_BASE}/products`);
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      setProductError("Unable to load inventory data.");
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  // Keep the page background (html/body) in sync with the theme so no
  // area outside .app-shell (overscroll, gaps) stays white in dark mode.
  useEffect(() => {
    document.documentElement.classList.toggle("theme-dark", darkMode);
  }, [darkMode]);

  function retryProductLoad() {
    setLoadingProducts(true);
    setProductError("");
    fetchProducts();
  }

  const navigation = [
    { name: "Dashboard", icon: "▦" },
    { name: "Inventory", icon: "📦" },
    { name: "Orders", icon: "🧾" },
    { name: "Functions", icon: "ƒ" },
  ];

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

        <button
          className="sidebar-bottom sidebar-profile"
          type="button"
          onClick={() => setActivePage("Account Management")}
          aria-label="Open account management"
        >
          <div className="avatar">SM</div>
          <div>
            <strong>Store Manager</strong>
            <small>Store Manager</small>
          </div>
        </button>
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
          {activePage !== "Dashboard" && (
          <div className="page-heading">
            <div>
              <p className="eyebrow">RETAIL MANAGEMENT</p>

              <h1>
                {activePage}
              </h1>

              <p className="subtitle">
                Manage your store operations from one place.
              </p>
            </div>

            <span className="date-label">ShopSphere Workspace</span>
          </div>
          )}

          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <Dashboard
              products={products}
              loadingProducts={loadingProducts}
              productError={productError}
              onRetry={retryProductLoad}
              onNavigate={setActivePage}
            />
          )}

          {/* INVENTORY */}
          {activePage === "Inventory" && <Inventory />}

{/* ORDERS */}
{activePage === "Orders" && <Orders />}

{/* FUNCTIONS — ANALYTICS & INTELLIGENCE LAB */}
{activePage === "Functions" && <Functions />}

          {activePage === "Account Management" && (
            <AccountManagement
              onBack={() => setActivePage("Dashboard")}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

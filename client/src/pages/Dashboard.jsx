import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import api from "../api";
import {
  ORDER_STATUSES,
  formatDate,
  formatINR,
  getOrderTotal,
  loadOrders,
  summarize,
} from "../data/orders";
import "./Dashboard.css";

const num = (value) => Number(value || 0);
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

function median(values) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1));
}

function pearson(xs, ys) {
  if (xs.length < 2) return null;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  xs.forEach((x, i) => {
    sxy += (x - mx) * (ys[i] - my);
    sxx += (x - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  });
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const STOCK_COLORS = {
  "In stock": "var(--db-green)",
  "Low stock": "var(--db-amber)",
  "Out of stock": "var(--db-red)",
};

const STATUS_COLORS = {
  Pending: "var(--db-amber)",
  Processing: "var(--db-blue)",
  Shipped: "var(--accent)",
  Delivered: "var(--db-green)",
  Cancelled: "var(--db-red)",
};

function Card({ title, subtitle, action, onAction, children, className = "" }) {
  return (
    <section className={`db-card ${className}`}>
      <header className="db-card-head">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && (
          <button type="button" className="db-link" onClick={onAction}>
            {action}
          </button>
        )}
      </header>
      {children}
    </section>
  );
}

function Bars({ rows, format }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="db-bars">
      {rows.map((row) => (
        <div className="db-bar" key={row.label}>
          <div className="db-bar-meta">
            <span title={row.label}>{row.label}</span>
            <strong>{format ? format(row.value) : row.value}</strong>
          </div>
          <div className="db-bar-track">
            <span style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Dashboard({ products, loadingProducts, productError, onRetry, onNavigate }) {
  const [orders] = useState(loadOrders);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState("loading");

  useEffect(() => {
    let active = true;
    api
      .get("/account/profile")
      .then((res) => {
        if (!active) return;
        setProfile(res.data?.profile || res.data);
        setProfileState("ready");
      })
      .catch((err) => {
        if (!active) return;
        setProfileState(err.response?.status === 404 ? "empty" : "error");
      });
    return () => {
      active = false;
    };
  }, []);

  const orderStats = summarize(orders);

  const recentOrders = useMemo(
    () => [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6),
    [orders]
  );

  const revenueSeries = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        key: d.toDateString(),
        label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        revenue: 0,
      });
    }
    orders.forEach((order) => {
      if (order.status === "Cancelled") return;
      const slot = days.find((d) => d.key === new Date(order.date).toDateString());
      if (slot) slot.revenue += getOrderTotal(order);
    });
    return days;
  }, [orders]);

  const weekRevenue = revenueSeries.slice(7).reduce((s, d) => s + d.revenue, 0);
  const prevWeekRevenue = revenueSeries.slice(0, 7).reduce((s, d) => s + d.revenue, 0);
  const weekChange = prevWeekRevenue
    ? Math.round(((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100)
    : null;

  const pipeline = ORDER_STATUSES.map((status) => ({
    status,
    count: orders.filter((o) => o.status === status).length,
  }));

  const inventory = useMemo(() => {
    const prices = products.map((p) => num(p.price));
    const stocks = products.map((p) => num(p.stock));
    const value = products.reduce((s, p) => s + num(p.price) * num(p.stock), 0);
    const low = products.filter((p) => num(p.stock) > 0 && num(p.stock) <= 5);
    const out = products.filter((p) => num(p.stock) === 0);
    const healthy = products.length - low.length - out.length;

    const complete = products.filter(
      (p) => p.name && p.category && p.price != null && p.price !== "" && p.stock != null && p.stock !== ""
    ).length;

    const counts = {};
    products.forEach((p) => {
      const key = p.category || "Uncategorised";
      counts[key] = (counts[key] || 0) + 1;
    });
    const categories = Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const revenue = {};
    orders.forEach((order) => {
      if (order.status === "Cancelled") return;
      order.items.forEach((item) => {
        revenue[item.category] = (revenue[item.category] || 0) + item.price * item.quantity;
      });
    });
    const revenueByCategory = Object.entries(revenue)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    const watchlist = [...products]
      .sort((a, b) => num(a.stock) - num(b.stock))
      .slice(0, 5);

    return {
      value,
      low: low.length,
      out: out.length,
      healthy,
      completeness: products.length ? Math.round((complete / products.length) * 100) : 0,
      complete,
      categories,
      revenueByCategory,
      mean: mean(prices),
      median: median(prices),
      sd: stdDev(prices),
      r: pearson(prices, stocks),
      watchlist,
    };
  }, [products, orders]);

  const stockDonut = [
    { name: "In stock", value: inventory.healthy },
    { name: "Low stock", value: inventory.low },
    { name: "Out of stock", value: inventory.out },
  ].filter((d) => d.value > 0);

  const hasProducts = products.length > 0;
  const dash = "—";
  const firstName = profile?.fullName?.split(" ")[0];
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const needsAttention = inventory.low + inventory.out;

  const kpis = [
    {
      icon: "▦",
      tone: "purple",
      label: "Products",
      value: loadingProducts ? "…" : products.length,
      note: "in your catalogue",
      go: "Inventory",
    },
    {
      icon: "₹",
      tone: "green",
      label: "Inventory value",
      value: loadingProducts ? "…" : formatINR(inventory.value),
      note: "price × units on hand",
      go: "Inventory",
    },
    {
      icon: "🧾",
      tone: "blue",
      label: "Open orders",
      value: orderStats.open,
      note: `of ${orderStats.total} total orders`,
      go: "Orders",
    },
    {
      icon: "!",
      tone: needsAttention ? "amber" : "green",
      label: "Stock alerts",
      value: loadingProducts ? "…" : needsAttention,
      note: `${inventory.low} low · ${inventory.out} out of stock`,
      go: "Inventory",
    },
  ];

  const modules = [
    {
      id: "etl",
      icon: "⇄",
      title: "ETL & Data Quality",
      metric: hasProducts ? `${inventory.completeness}%` : dash,
      caption: hasProducts
        ? `${inventory.complete}/${products.length} records complete`
        : "Upload data to profile it",
    },
    {
      id: "eda",
      icon: "⌁",
      title: "Exploratory Analysis",
      body: hasProducts ? <Bars rows={inventory.categories} /> : null,
      caption: hasProducts ? "Products per category" : "Add products to explore",
    },
    {
      id: "olap",
      icon: "◫",
      title: "OLAP Explorer",
      body: <Bars rows={inventory.revenueByCategory} format={formatINR} />,
      caption: "Revenue roll-up by category",
    },
    {
      id: "stats",
      icon: "∑",
      title: "Statistical Analysis",
      metric: hasProducts ? formatINR(inventory.mean) : dash,
      caption: hasProducts
        ? `Mean price · median ${formatINR(inventory.median)} · σ ${formatINR(inventory.sd)}`
        : "Add products to compute",
    },
    {
      id: "regression",
      icon: "↗",
      title: "Regression Analysis",
      metric: inventory.r == null ? dash : inventory.r.toFixed(2),
      caption: "Price ↔ stock correlation (r)",
    },
  ];

  return (
    <div className="db">
      {productError && (
        <div className="db-alert" role="alert">
          <span>{productError} Check that the backend server is running.</span>
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}

      {/* HERO */}
      <section className="db-hero">
        <div className="db-hero-copy">
          <p className="db-hero-date">{today}</p>
          <h1>
            {greeting()}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="db-hero-sub">
            {needsAttention > 0
              ? `${needsAttention} product${needsAttention === 1 ? " needs" : "s need"} restocking and ${orderStats.open} order${orderStats.open === 1 ? " is" : "s are"} waiting to be fulfilled.`
              : `Stock levels look healthy and ${orderStats.open} order${orderStats.open === 1 ? " is" : "s are"} waiting to be fulfilled.`}
          </p>
          <div className="db-hero-actions">
            <button type="button" className="db-btn db-btn--light" onClick={() => onNavigate("Orders")}>
              View orders
            </button>
            <button type="button" className="db-btn db-btn--outline" onClick={() => onNavigate("Inventory")}>
              Manage inventory
            </button>
            <button type="button" className="db-btn db-btn--outline" onClick={() => onNavigate("Functions")}>
              Open analytics
            </button>
          </div>
        </div>

        <div className="db-hero-chart">
          <div className="db-hero-chart-head">
            <div>
              <span>Revenue · last 14 days</span>
              <strong>{formatINR(orderStats.revenue)}</strong>
            </div>
            {weekChange !== null && (
              <span className={`db-delta ${weekChange >= 0 ? "up" : "down"}`}>
                {weekChange >= 0 ? "▲" : "▼"} {Math.abs(weekChange)}% vs prior week
              </span>
            )}
          </div>
          <div className="db-hero-chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 6, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dbHeroFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <Tooltip
                  formatter={(v) => [formatINR(v), "Revenue"]}
                  cursor={{ stroke: "rgba(255,255,255,0.5)" }}
                  contentStyle={{ background: "#1d1b2e", border: "none", borderRadius: 8, color: "#fff", fontSize: 12 }}
                  labelStyle={{ color: "#cfcaf5" }}
                  itemStyle={{ color: "#fff" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ffffff" strokeWidth={2.5} fill="url(#dbHeroFill)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* KPI STRIP */}
      <section className="db-kpis">
        {kpis.map((kpi) => (
          <button type="button" key={kpi.label} className="db-kpi" onClick={() => onNavigate(kpi.go)}>
            <span className={`db-kpi-icon ${kpi.tone}`}>{kpi.icon}</span>
            <span className="db-kpi-text">
              <span className="db-kpi-label">{kpi.label}</span>
              <strong>{kpi.value}</strong>
              <span className="db-kpi-note">{kpi.note}</span>
            </span>
          </button>
        ))}
      </section>

      {/* MAIN ROW */}
      <div className="db-row db-row--main">
        <Card
          title="Recent orders"
          subtitle="Latest transactions across the store"
          action="All orders →"
          onAction={() => onNavigate("Orders")}
          className="db-orders"
        >
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th className="num">Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td><strong>{order.id}</strong></td>
                    <td>
                      {order.customer}
                      <small>{order.city}</small>
                    </td>
                    <td>{formatDate(order.date)}</td>
                    <td className="num">{formatINR(getOrderTotal(order))}</td>
                    <td>
                      <span className={`order-badge order-badge--${order.status.toLowerCase()}`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="db-stack">
          <Card title="Stock health" subtitle="Share of products by availability">
            {hasProducts ? (
              <div className="db-donut">
                <div className="db-donut-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stockDonut} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="94%" paddingAngle={3} stroke="none">
                        {stockDonut.map((d) => (
                          <Cell key={d.name} fill={STOCK_COLORS[d.name]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="db-donut-center">
                    <strong>{products.length}</strong>
                    <span>products</span>
                  </div>
                </div>
                <ul className="db-legend">
                  {[
                    ["In stock", inventory.healthy],
                    ["Low stock", inventory.low],
                    ["Out of stock", inventory.out],
                  ].map(([name, count]) => (
                    <li key={name}>
                      <i style={{ background: STOCK_COLORS[name] }} />
                      <span>{name}</span>
                      <strong>{count}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="db-empty">{loadingProducts ? "Loading inventory…" : "No products yet."}</p>
            )}
          </Card>

          <Card title="Order pipeline" subtitle="Orders by fulfilment stage">
            <div className="db-pipeline-bar" role="img" aria-label="Order status distribution">
              {pipeline.map((p) =>
                p.count ? (
                  <span key={p.status} style={{ flex: p.count, background: STATUS_COLORS[p.status] }} title={`${p.status}: ${p.count}`} />
                ) : null
              )}
            </div>
            <ul className="db-legend db-legend--grid">
              {pipeline.map((p) => (
                <li key={p.status}>
                  <i style={{ background: STATUS_COLORS[p.status] }} />
                  <span>{p.status}</span>
                  <strong>{p.count}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {/* SECOND ROW */}
      <div className="db-row db-row--second">
        <Card
          title="Inventory watchlist"
          subtitle="Products with the lowest stock first"
          action="Open inventory →"
          onAction={() => onNavigate("Inventory")}
        >
          {hasProducts ? (
            <ul className="db-watch">
              {inventory.watchlist.map((p) => {
                const stock = num(p.stock);
                const state = stock === 0 ? "out" : stock <= 5 ? "low" : "ok";
                return (
                  <li key={p._id}>
                    <div className="db-watch-name">
                      <strong>{p.name}</strong>
                      <small>{p.category || "Uncategorised"} · {formatINR(num(p.price))}</small>
                    </div>
                    <div className="db-watch-meter">
                      <span className={`db-meter ${state}`}>
                        <span style={{ width: `${Math.min(100, (stock / 20) * 100)}%` }} />
                      </span>
                      <b>{stock} units</b>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="db-empty">{loadingProducts ? "Loading inventory…" : "No products yet."}</p>
          )}
        </Card>

        <Card title="Account" subtitle="Store manager profile" action="Manage →" onAction={() => onNavigate("Account Management")}>
          {profileState === "ready" && profile ? (
            <div className="db-profile">
              <div className="db-profile-top">
                <span className="db-profile-avatar">
                  {(profile.fullName || "SM")
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div>
                  <strong>{profile.fullName || dash}</strong>
                  <span>{profile.role || dash}</span>
                </div>
                <em className={`db-pill ${profile.status === "Active" ? "ok" : ""}`}>{profile.status || dash}</em>
              </div>
              <dl>
                <div><dt>Store</dt><dd>{profile.storeName || dash}</dd></div>
                <div><dt>Email</dt><dd>{profile.email || dash}</dd></div>
                <div><dt>Phone</dt><dd>{profile.phone || dash}</dd></div>
              </dl>
            </div>
          ) : (
            <p className="db-empty">
              {profileState === "loading"
                ? "Loading profile…"
                : profileState === "empty"
                  ? "No profile saved yet. Open Account Management to create one."
                  : "Profile unavailable. Check that the backend server is running."}
            </p>
          )}
        </Card>
      </div>

      {/* ANALYTICS LAB */}
      <Card
        title="Analytics & Intelligence Lab"
        subtitle="Live snapshot from every analysis module, calculated from your store data"
        action="Open Functions →"
        onAction={() => onNavigate("Functions")}
      >
        <div className="db-modules">
          {modules.map((m, index) => (
            <button type="button" key={m.id} className="db-module" onClick={() => onNavigate("Functions")}>
              <span className="db-module-top">
                <span className="db-module-icon">{m.icon}</span>
                <span className="db-module-num">0{index + 1}</span>
              </span>
              <span className="db-module-title">{m.title}</span>
              <span className="db-module-body">
                {m.metric !== undefined ? <strong className="db-metric">{m.metric}</strong> : m.body}
              </span>
              <span className="db-module-caption">{m.caption}</span>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default Dashboard;

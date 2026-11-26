import { useEffect, useState } from "react";
import api from "../api";
import "./EDAModule.css";

const API_BASE = "/sales/analytics";

const ENDPOINTS = {
  summary: `${API_BASE}/summary`,
  trends: `${API_BASE}/trends`,
  products: `${API_BASE}/products`,
  bundles: `${API_BASE}/bundles`,
};

const currency = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

const number = (value) =>
  Number(value || 0).toLocaleString("en-IN");

function formatDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function SalesTrendChart({ trends }) {
  if (!trends.length) {
    return <div className="eda-chart-empty">No trend data available.</div>;
  }

  const width = 760;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 42, left: 62 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    1,
    ...trends.map((item) => Math.max(item.revenue || 0, item.profit || 0))
  );

  const x = (index) =>
    padding.left +
    (trends.length === 1
      ? chartWidth / 2
      : (index / (trends.length - 1)) * chartWidth);

  const y = (value) =>
    padding.top + chartHeight - (value / maxValue) * chartHeight;

  const makePath = (key) =>
    trends
      .map(
        (item, index) =>
          `${index === 0 ? "M" : "L"} ${x(index)} ${y(item[key] || 0)}`
      )
      .join(" ");

  const gridValues = [0, 0.25, 0.5, 0.75, 1];

  const labelIndexes = [
    0,
    Math.floor((trends.length - 1) / 3),
    Math.floor(((trends.length - 1) * 2) / 3),
    trends.length - 1,
  ].filter((value, index, arr) => arr.indexOf(value) === index);

  return (
    <div className="eda-chart-container">
      <div className="eda-chart-legend">
        <span>
          <i className="eda-legend-dot revenue-dot" />
          Revenue
        </span>
        <span>
          <i className="eda-legend-dot profit-dot" />
          Profit
        </span>
      </div>

      <svg
        className="eda-trend-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Daily revenue and profit trend chart"
      >
        {gridValues.map((fraction) => {
          const value = maxValue * fraction;
          const positionY = y(value);

          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                y1={positionY}
                x2={width - padding.right}
                y2={positionY}
                className="eda-chart-grid"
              />

              <text
                x={padding.left - 10}
                y={positionY + 4}
                textAnchor="end"
                className="eda-chart-axis-label"
              >
                {Math.round(value / 1000)}k
              </text>
            </g>
          );
        })}

        <path d={makePath("revenue")} className="eda-line revenue-line" />
        <path d={makePath("profit")} className="eda-line profit-line" />

        {trends.map((item, index) => (
          <g key={item.date}>
            <circle
              cx={x(index)}
              cy={y(item.revenue || 0)}
              r="3"
              className="eda-chart-point revenue-point"
            >
              <title>
                {item.date}: Revenue {currency(item.revenue)}
              </title>
            </circle>

            <circle
              cx={x(index)}
              cy={y(item.profit || 0)}
              r="3"
              className="eda-chart-point profit-point"
            >
              <title>
                {item.date}: Profit {currency(item.profit)}
              </title>
            </circle>
          </g>
        ))}

        {labelIndexes.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 13}
            textAnchor="middle"
            className="eda-chart-axis-label"
          >
            {formatDate(trends[index].date)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function ProductTable({ title, products, type }) {
  return (
    <section className="eda-panel">
      <div className="eda-panel-heading">
        <div>
          <h4>{title}</h4>
          <p className="eda-muted">
            Product performance from the uploaded sales dataset.
          </p>
        </div>
      </div>

      {!products.length ? (
        <div className="eda-chart-empty">No product data available.</div>
      ) : (
        <div className="eda-table-wrap">
          <table className="eda-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Units</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product, index) => (
                <tr key={product._id || `${product.productName}-${index}`}>
                  <td>
                    <div className="eda-product-cell">
                      <span className={`eda-product-rank ${type}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <div>
                        <strong>{product.productName}</strong>
                        <small>{product.category}</small>
                      </div>
                    </div>
                  </td>

                  <td>{number(product.unitsSold)}</td>
                  <td>{currency(product.revenue)}</td>
                  <td>{currency(product.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EDAModule() {
  const [data, setData] = useState({
    summary: null,
    trends: [],
    products: { topProducts: [], bottomProducts: [] },
    bundles: [],
    totalOrdersAnalyzed: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");

    try {
      const responses = await Promise.all(
        Object.values(ENDPOINTS).map((url) => api.get(url))
      );
      const [summary, trends, products, bundles] = responses.map(
        (response) => response.data
      );

      setData({
        summary,
        trends: Array.isArray(trends) ? trends : [],
        products: {
          topProducts: products.topProducts || [],
          bottomProducts: products.bottomProducts || [],
        },
        bundles: bundles.bundles || [],
        totalOrdersAnalyzed: bundles.totalOrdersAnalyzed || 0,
      });
    } catch (err) {
      setError(
        `${err.response?.data?.message || err.message}. Check that your backend is running on port 5000.`
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="eda-state">
        <div className="eda-loader" />
        Loading sales analytics…
      </div>
    );
  }

  if (error) {
    return (
      <div className="eda-state eda-error">
        <h4>Could not load sales analytics</h4>
        <p>{error}</p>

        <button
          type="button"
          className="eda-refresh"
          onClick={loadAnalytics}
        >
          Try again
        </button>
      </div>
    );
  }

  const summary = data.summary || {};

  const kpis = [
    {
      label: "Total Revenue",
      value: currency(summary.totalRevenue),
      color: "purple",
      symbol: "↗",
    },
    {
      label: "Total Profit",
      value: currency(summary.totalProfit),
      color: "green",
      symbol: "₹",
    },
    {
      label: "Units Sold",
      value: number(summary.totalUnits),
      color: "blue",
      symbol: "▤",
    },
    {
      label: "Profit Margin",
      value: `${Number(summary.profitMargin || 0).toFixed(2)}%`,
      color: "orange",
      symbol: "%",
    },
  ];

  return (
    <div className="eda-module">
      <div className="eda-heading">
        <div>
          <p className="eda-eyebrow">DATA SCIENCE / MODULE 02</p>
          <h3>Exploratory Data Analysis</h3>
          <p>
            Discover sales performance, product patterns, and frequently
            purchased combinations from your uploaded dataset.
          </p>
        </div>

        <button
          type="button"
          className="eda-refresh"
          onClick={loadAnalytics}
        >
          ↻ Refresh data
        </button>
      </div>

      {/* Sales KPIs */}
      <div className="eda-kpis">
        {kpis.map((kpi) => (
          <article className="eda-kpi" key={kpi.label}>
            <div className="eda-kpi-top">
              <span>{kpi.label}</span>
              <span className={`eda-kpi-symbol ${kpi.color}`}>
                {kpi.symbol}
              </span>
            </div>

            <strong>{kpi.value}</strong>
          </article>
        ))}
      </div>

      {/* Additional summary values */}
      <div className="eda-summary-strip">
        <div>
          <span>Total Cost</span>
          <strong>{currency(summary.totalCost)}</strong>
        </div>

        <div>
          <span>Line Items</span>
          <strong>{number(summary.totalLineItems)}</strong>
        </div>

        <div>
          <span>Returned Items</span>
          <strong>{number(summary.returnedItems)}</strong>
        </div>
      </div>

      {/* Trend chart */}
      <section className="eda-panel">
        <div className="eda-panel-heading">
          <div>
            <p className="eda-section-eyebrow">PERFORMANCE OVER TIME</p>
            <h4>Revenue & Profit Trends</h4>
            <p className="eda-muted">
              Daily revenue and profit from the uploaded sales data.
            </p>
          </div>
        </div>

        <SalesTrendChart trends={data.trends} />
      </section>

      {/* Product performance */}
      <div className="eda-product-grid">
        <ProductTable
          title="Top Performing Products"
          products={data.products.topProducts}
          type="top"
        />

        <ProductTable
          title="Lowest Performing Products"
          products={data.products.bottomProducts}
          type="bottom"
        />
      </div>

      {/* Frequently bought together */}
      <section className="eda-panel">
        <div className="eda-panel-heading">
          <div>
            <p className="eda-section-eyebrow">MARKET BASKET INSIGHTS</p>
            <h4>Frequently Bought Together</h4>
            <p className="eda-muted">
              Product pairs that appeared together in the analyzed orders.
            </p>
          </div>

          <span className="eda-orders-badge">
            {number(data.totalOrdersAnalyzed)} orders analyzed
          </span>
        </div>

        {!data.bundles.length ? (
          <div className="eda-chart-empty">No bundle data available.</div>
        ) : (
          <div className="eda-bundle-list">
            {data.bundles.map((bundle, index) => (
              <div
                className="eda-bundle-row"
                key={`${bundle.productA.id}-${bundle.productB.id}`}
              >
                <span className="eda-bundle-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div className="eda-bundle-products">
                  <span>{bundle.productA.name}</span>
                  <span className="eda-bundle-plus">+</span>
                  <span>{bundle.productB.name}</span>
                </div>

                <div className="eda-bundle-count">
                  <strong>{bundle.coOrderCount}</strong>
                  <span>co-orders</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="eda-footer-note">
        Analytics are calculated from the sales dataset currently processed
        by the backend.
      </div>
    </div>
  );
}

export default EDAModule;
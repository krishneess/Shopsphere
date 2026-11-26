import "./fx.css";

export const fmt = (value, digits = 2) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: digits,
        minimumFractionDigits: 0,
      });

export const fmtFixed = (value, digits = 4) =>
  value === null || value === undefined || Number.isNaN(Number(value))
    ? "—"
    : Number(value).toFixed(digits);

export const fmtP = (p) => {
  if (p === null || p === undefined) return "—";
  return p < 0.0001 ? "< 0.0001" : p.toFixed(4);
};

export const pct = (value, digits = 1) =>
  value === null || value === undefined ? "—" : `${(value * 100).toFixed(digits)}%`;

export function Header({ title, subtitle, badge }) {
  // The Functions hub already shows the module number and title above this
  // block, so only the description and badge are shown visually.
  return (
    <div className="fx-head">
      <div>
        <h2 className="fx-sr-only">{title}</h2>
        {subtitle && <p className="fx-sub fx-sub--lead">{subtitle}</p>}
      </div>
      {badge && <span className="fx-badge">{badge}</span>}
    </div>
  );
}

export function Kpis({ items }) {
  return (
    <div className="fx-kpis">
      {items.map((item) => (
        <div className="fx-kpi" key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.note && <small>{item.note}</small>}
        </div>
      ))}
    </div>
  );
}

export function Card({ title, subtitle, children, className = "", actions }) {
  return (
    <section className={`fx-card ${className}`}>
      {(title || actions) && (
        <header className="fx-card-head">
          <div>
            {title && <h3>{title}</h3>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <label className="fx-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function Status({ loading, error, children }) {
  if (error) return <div className="fx-state fx-state--error">{error}</div>;
  if (loading && !children) return <div className="fx-state">Running analysis…</div>;
  return children || null;
}

export function Insight({ children }) {
  return (
    <div className="fx-insight">
      <span aria-hidden="true">✦</span>
      <p>{children}</p>
    </div>
  );
}

export const chartTooltip = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--text)",
    fontSize: 12,
  },
  labelStyle: { color: "var(--text)" },
  itemStyle: { color: "var(--text)" },
};

export const axisTick = { fill: "var(--text-secondary)", fontSize: 11 };

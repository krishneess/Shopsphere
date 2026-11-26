import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useApi from "../shared/useApi";
import {
  Card,
  Field,
  Header,
  Insight,
  Kpis,
  Status,
  axisTick,
  chartTooltip,
  fmt,
  fmtFixed,
  pct,
} from "../shared/ui";

const SORTS = {
  lift: "Lift",
  confidence: "Confidence",
  support: "Support",
};

function Items({ items }) {
  return (
    <span className="fx-itemset">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </span>
  );
}

export default function AssociationRules() {
  const [level, setLevel] = useState("product");
  const [supportDraft, setSupportDraft] = useState(3);
  const [confidenceDraft, setConfidenceDraft] = useState(30);
  const [applied, setApplied] = useState({ support: 3, confidence: 30 });
  const [sortBy, setSortBy] = useState("lift");
  const [showAll, setShowAll] = useState(false);

  // Wait for the sliders to settle before querying the server
  useEffect(() => {
    const timer = setTimeout(() => setApplied({ support: supportDraft, confidence: confidenceDraft }), 250);
    return () => clearTimeout(timer);
  }, [supportDraft, confidenceDraft]);

  const { data, error, loading } = useApi("/mining/association", {
    level,
    minSupport: applied.support / 100,
    minConfidence: applied.confidence / 100,
  });

  const rules = data ? [...data.rules].sort((a, b) => b[sortBy] - a[sortBy] || b.lift - a.lift) : [];
  const visible = showAll ? rules : rules.slice(0, 12);
  const top = rules[0];

  const itemsetChart = data
    ? data.itemsets
        .filter((s) => s.items.length >= 2)
        .slice(0, 8)
        .map((s) => ({ name: s.items.join(" + "), support: Number((s.support * 100).toFixed(2)) }))
    : [];

  const itemChart = data
    ? data.itemsets
        .filter((s) => s.items.length === 1)
        .slice(0, 8)
        .map((s) => ({ name: s.items[0], support: Number((s.support * 100).toFixed(2)) }))
    : [];

  return (
    <div className="fx">
      <Header
        eyebrow="Data Mining · Function 07"
        title="Association Rule Mining"
        subtitle="Finds products (or categories) that customers tend to buy together using the Apriori algorithm. Each order is a basket; rules are scored by support, confidence and lift."
        badge="Apriori"
      />

      <div className="fx-controls">
        <div className="fx-field">
          <span>Mine rules on</span>
          <div className="fx-segmented" role="group" aria-label="Item level">
            {[
              ["product", "Products"],
              ["category", "Categories"],
            ].map(([key, label]) => (
              <button type="button" key={key} className={level === key ? "active" : ""} onClick={() => setLevel(key)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Minimum support">
          <input type="range" min="1" max="30" step="1" value={supportDraft} onChange={(e) => setSupportDraft(Number(e.target.value))} />
          <span className="fx-range-value">{supportDraft}% of orders</span>
        </Field>

        <Field label="Minimum confidence">
          <input type="range" min="10" max="100" step="5" value={confidenceDraft} onChange={(e) => setConfidenceDraft(Number(e.target.value))} />
          <span className="fx-range-value">{confidenceDraft}%</span>
        </Field>

        <Field label="Sort rules by">
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {Object.entries(SORTS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Status loading={loading} error={error}>
        {data && (
          <>
            <Kpis
              items={[
                { label: "Orders (baskets)", value: data.totalTransactions, note: `${data.multiItemTransactions} contain 2+ items` },
                { label: "Distinct items", value: data.uniqueItems, note: `Avg basket ${data.averageBasketSize}` },
                { label: "Frequent itemsets", value: data.itemsets.length, note: `Support ≥ ${data.minSupportCount} orders` },
                { label: "Rules found", value: data.rules.length, note: `Confidence ≥ ${applied.confidence}%` },
              ]}
            />

            {top ? (
              <Insight>
                Strongest rule: customers who buy <b>{top.antecedent.join(" + ")}</b> also buy <b>{top.consequent.join(" + ")}</b> in{" "}
                <b>{pct(top.confidence, 0)}</b> of those orders. That is <b>{fmt(top.lift, 2)}×</b>{" "}
                {top.lift >= 1 ? "more likely" : "less likely"} than chance (lift), and the pattern appears in {top.supportCount} orders (
                {pct(top.support)} of all orders).
              </Insight>
            ) : (
              <Insight>
                No rules meet these thresholds. Try lowering the minimum support or confidence, or mine on Categories.
              </Insight>
            )}

            <div className="fx-grid-2">
              <Card title="Apriori passes" subtitle="Candidates are generated from the previous level, then pruned by minimum support.">
                <div className="fx-table-wrap">
                  <table className="fx-table">
                    <thead>
                      <tr>
                        <th>Pass</th>
                        <th className="num">Candidates (Cₖ)</th>
                        <th className="num">Frequent (Lₖ)</th>
                        <th className="num">Pruned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.levels.map((l) => (
                        <tr key={l.size}>
                          <td><strong>k = {l.size}</strong> ({l.size === 1 ? "single items" : `${l.size}-itemsets`})</td>
                          <td className="num">{l.candidates}</td>
                          <td className="num">{l.frequent}</td>
                          <td className="num">{l.candidates - l.frequent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="fx-note">
                  Support = orders containing the itemset ÷ all orders. Confidence = support(A ∪ B) ÷ support(A). Lift =
                  confidence ÷ support(B); a lift above 1 means A and B occur together more often than chance.
                </p>
              </Card>

              <Card
                title={itemsetChart.length ? "Most frequent item combinations" : "Most frequent items"}
                subtitle="Share of orders (%) containing the itemset."
              >
                <ResponsiveContainer width="100%" height={Math.max(220, (itemsetChart.length || itemChart.length) * 36)}>
                  <BarChart
                    data={itemsetChart.length ? itemsetChart : itemChart}
                    layout="vertical"
                    margin={{ top: 4, right: 24, bottom: 4, left: 10 }}
                  >
                    <CartesianGrid stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={axisTick} unit="%" />
                    <YAxis type="category" dataKey="name" tick={axisTick} width={170} />
                    <Tooltip formatter={(v) => `${v}%`} cursor={{ fill: "var(--surface-hover)" }} {...chartTooltip} />
                    <Bar dataKey="support" name="Support" fill="var(--accent)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card
              title={`Association rules (${rules.length})`}
              subtitle={`Sorted by ${SORTS[sortBy].toLowerCase()}. Rule format: IF customer buys A → THEN also buys B.`}
              actions={
                rules.length > 12 && (
                  <button type="button" className="fx-chip" onClick={() => setShowAll((v) => !v)}>
                    {showAll ? "Show top 12" : `Show all ${rules.length}`}
                  </button>
                )
              }
            >
              {rules.length === 0 ? (
                <p className="fx-note">No rules to display.</p>
              ) : (
                <div className="fx-table-wrap">
                  <table className="fx-table">
                    <thead>
                      <tr>
                        <th>Rule</th>
                        <th className="num">Support</th>
                        <th className="num">Confidence</th>
                        <th className="num">Lift</th>
                        <th className="num">Leverage</th>
                        <th className="num">Conviction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((rule) => (
                        <tr key={`${rule.antecedent.join("|")}->${rule.consequent.join("|")}`}>
                          <td>
                            <Items items={rule.antecedent} />
                            <span className="fx-arrow">→</span>
                            <Items items={rule.consequent} />
                          </td>
                          <td className="num">{pct(rule.support)} <small>({rule.supportCount})</small></td>
                          <td className="num">
                            <span className="fx-meter"><i style={{ width: `${rule.confidence * 100}%` }} /></span>
                            {pct(rule.confidence, 0)}
                          </td>
                          <td className="num">
                            <span className={`fx-sig ${rule.lift > 1 ? "yes" : rule.lift === 1 ? "no" : "bad"}`}>{fmtFixed(rule.lift, 2)}</span>
                          </td>
                          <td className="num">{fmtFixed(rule.leverage, 3)}</td>
                          <td className="num">{rule.conviction === null ? "∞" : fmtFixed(rule.conviction, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </Status>
    </div>
  );
}

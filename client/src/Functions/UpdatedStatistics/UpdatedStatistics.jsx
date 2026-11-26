import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useApi from "../shared/useApi";
import { Card, Field, Header, Kpis, Status, axisTick, chartTooltip, fmt, fmtFixed, fmtP } from "../shared/ui";
import "./UpdatedStatistics.css";

const ALPHAS = [0.01, 0.05, 0.1];
const ALTERNATIVES = [
  ["two", "Two-tailed (≠)"],
  ["greater", "Right-tailed (>)"],
  ["less", "Left-tailed (<)"],
];

function defaultsFor(test, options) {
  const fieldMean = (key) => options.fields.find((f) => f.key === key)?.mean ?? 0;
  const values = (variable) => options.variables.find((v) => v.key === variable)?.values || [];
  const base = { alpha: 0.05, alt: "two" };

  if (test === "z" || test === "t1") {
    return { ...base, field: "revenue", mu0: String(Math.round(fieldMean("revenue") / 100) * 100), sigma: "" };
  }
  if (test === "t2" || test === "f") {
    const v = values("Category");
    return { ...base, field: test === "f" ? "unitPrice" : "profit", groupBy: "Category", a: v[0], b: v[1] };
  }
  if (test === "anova") return { ...base, field: "revenue", groupBy: "Category" };
  if (test === "chi-ind") return { ...base, var1: "Category", var2: "Profit Level" };
  return { ...base, var1: "Order Weekday" };
}

function DistributionChart({ curve, critical, statistic, rejected }) {
  const [lo, hi] = curve.range;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={curve.points} margin={{ top: 16, right: 20, bottom: 24, left: 0 }}>
        <CartesianGrid stroke="var(--border)" vertical={false} />
        <XAxis type="number" dataKey="x" domain={[lo, hi]} tick={axisTick} tickFormatter={(v) => Number(v).toFixed(1)} allowDataOverflow />
        <YAxis tick={axisTick} width={42} tickFormatter={(v) => Number(v).toFixed(2)} />
        <Tooltip formatter={(v) => Number(v).toFixed(4)} labelFormatter={(x) => `x = ${Number(x).toFixed(2)}`} {...chartTooltip} />
        <Area type="monotone" dataKey="y" name="Density" stroke="var(--text-muted)" fill="var(--accent-soft)" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Area type="monotone" dataKey="reject" name="Rejection region" stroke="none" fill="#e0707a" fillOpacity={0.55} dot={false} isAnimationActive={false} connectNulls={false} />
        {critical.map((c) => (
          <ReferenceLine key={c} x={c} stroke="#e0707a" strokeDasharray="5 4" />
        ))}
        <ReferenceLine
          x={Math.min(Math.max(statistic, lo), hi)}
          stroke="var(--accent)"
          strokeWidth={2.5}
          label={{ value: `stat = ${statistic}`, position: "top", fill: rejected ? "#e0707a" : "var(--accent)", fontSize: 12 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function Controls({ test, draft, set, options }) {
  const values = (variable) => options.variables.find((v) => v.key === variable)?.values || [];
  const fieldSelect = (
    <Field label="Numeric column">
      <select value={draft.field} onChange={(e) => set({ field: e.target.value })}>
        {options.fields.map((f) => (
          <option key={f.key} value={f.key}>{f.label}</option>
        ))}
      </select>
    </Field>
  );
  const alpha = (
    <Field label="Significance level (α)">
      <select value={draft.alpha} onChange={(e) => set({ alpha: Number(e.target.value) })}>
        {ALPHAS.map((a) => (
          <option key={a} value={a}>{a} ({Math.round((1 - a) * 100)}% confidence)</option>
        ))}
      </select>
    </Field>
  );
  const alt = (
    <Field label="Alternative hypothesis">
      <select value={draft.alt} onChange={(e) => set({ alt: e.target.value })}>
        {ALTERNATIVES.map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
    </Field>
  );
  const varSelect = (name, label, exclude) => (
    <Field label={label}>
      <select value={draft[name]} onChange={(e) => set({ [name]: e.target.value })}>
        {options.variables.filter((v) => v.key !== exclude).map((v) => (
          <option key={v.key} value={v.key}>{v.key}</option>
        ))}
      </select>
    </Field>
  );

  if (test === "z" || test === "t1") {
    const f = options.fields.find((x) => x.key === draft.field);
    return (
      <>
        {fieldSelect}
        <Field label="Hypothesised mean (μ₀)">
          <input type="number" value={draft.mu0} onChange={(e) => set({ mu0: e.target.value })} />
          <span className="fx-hint">Actual mean: {fmt(f?.mean, 2)}</span>
        </Field>
        {test === "z" && (
          <Field label="Known σ (optional)">
            <input type="number" value={draft.sigma} placeholder={`auto: ${fmt(f?.populationSd, 2)}`} onChange={(e) => set({ sigma: e.target.value })} />
          </Field>
        )}
        {alt}
        {alpha}
      </>
    );
  }

  if (test === "t2" || test === "f" || test === "anova") {
    const vals = values(draft.groupBy);
    return (
      <>
        {fieldSelect}
        <Field label="Compare groups of">
          <select
            value={draft.groupBy}
            onChange={(e) => {
              const v = values(e.target.value);
              set({ groupBy: e.target.value, a: v[0], b: v[1] });
            }}
          >
            {options.variables.map((v) => (
              <option key={v.key} value={v.key}>{v.key}</option>
            ))}
          </select>
        </Field>
        {test !== "anova" && (
          <>
            <Field label="Group A">
              <select value={draft.a} onChange={(e) => set({ a: e.target.value })}>
                {vals.map((v) => (
                  <option key={v} value={v} disabled={v === draft.b}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Group B">
              <select value={draft.b} onChange={(e) => set({ b: e.target.value })}>
                {vals.map((v) => (
                  <option key={v} value={v} disabled={v === draft.a}>{v}</option>
                ))}
              </select>
            </Field>
          </>
        )}
        {test === "t2" && alt}
        {alpha}
      </>
    );
  }

  if (test === "chi-ind") {
    return (
      <>
        {varSelect("var1", "Variable 1", draft.var2)}
        {varSelect("var2", "Variable 2", draft.var1)}
        {alpha}
      </>
    );
  }

  return (
    <>
      {varSelect("var1", "Categorical variable")}
      {alpha}
    </>
  );
}

function Results({ r }) {
  const dfText = r.df === null ? "—" : Array.isArray(r.df) ? `${r.df[0]}, ${r.df[1]}` : fmt(r.df, 2);
  const critText = r.critical.map((c) => fmtFixed(c, 4)).join(" / ");

  return (
    <>
      <div className={`fx-decision ${r.reject ? "reject" : "keep"}`}>
        <span className="fx-decision-tag">{r.reject ? "REJECT H₀" : "FAIL TO REJECT H₀"}</span>
        <p>{r.text}</p>
      </div>

      <div className="fx-grid-2">
        <Card title={r.title} subtitle={r.question}>
          <ul className="us-hyp">
            <li><b>Null</b><span>{r.hypotheses.h0}</span></li>
            <li><b>Alternative</b><span>{r.hypotheses.h1}</span></li>
            <li><b>Significance</b><span>α = {r.alpha}</span></li>
          </ul>
          <Kpis
            items={[
              { label: `Test statistic (${r.statistic.name})`, value: fmtFixed(r.statistic.value, 4) },
              { label: "Degrees of freedom", value: dfText },
              { label: "p-value", value: fmtP(r.pValue), note: r.pValue < r.alpha ? `< α (${r.alpha})` : `≥ α (${r.alpha})` },
              { label: "Critical value(s)", value: critText },
            ]}
          />
        </Card>

        <Card title="Where the statistic falls" subtitle="Red area = rejection region. If the statistic line lands in it, H₀ is rejected.">
          <DistributionChart curve={r.curve} critical={r.critical} statistic={r.statistic.value} rejected={r.reject} />
        </Card>
      </div>

      {r.warnings?.length > 0 && (
        <div className="fx-state fx-state--error" style={{ textAlign: "left" }}>
          {r.warnings.map((w) => (
            <p key={w} style={{ margin: "0 0 4px" }}>⚠ {w}</p>
          ))}
        </div>
      )}

      <div className="fx-grid-2 fx-grid-2--wide">
        <Card title="Worked calculation" subtitle="Each formula applied to your data.">
          <ol className="fx-steps">
            {r.steps.map((s) => (
              <li key={s.label}>
                <div>
                  <b>{s.label}</b>
                  <code>{s.formula}</code>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div style={{ display: "flex", flexDirection: "column", gap: 22, minWidth: 0 }}>
          {r.groups && (
            <Card title="Sample summary">
              <div className="fx-table-wrap">
                <table className="fx-table">
                  <thead>
                    <tr>
                      <th>Group</th>
                      <th className="num">n</th>
                      <th className="num">Mean</th>
                      <th className="num">Std. dev.</th>
                      <th className="num">Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.groups.map((g) => (
                      <tr key={g.label}>
                        <td><strong>{g.label}</strong></td>
                        <td className="num">{g.n}</td>
                        <td className="num">{fmt(g.mean, 2)}</td>
                        <td className="num">{fmt(g.sd, 2)}</td>
                        <td className="num">{fmt(g.variance, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {r.anovaTable && (
            <Card title="ANOVA table">
              <div className="fx-table-wrap">
                <table className="fx-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th className="num">SS</th>
                      <th className="num">df</th>
                      <th className="num">MS</th>
                      <th className="num">F</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.anovaTable.map((row) => (
                      <tr key={row.source}>
                        <td><strong>{row.source}</strong></td>
                        <td className="num">{fmt(row.ss, 2)}</td>
                        <td className="num">{row.df}</td>
                        <td className="num">{row.ms === null ? "—" : fmt(row.ms, 2)}</td>
                        <td className="num">{row.f === null ? "—" : fmtFixed(row.f, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {r.goodnessOfFit && (
            <Card title="Observed vs expected">
              <div className="fx-table-wrap">
                <table className="fx-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="num">Observed</th>
                      <th className="num">Expected</th>
                      <th className="num">(O−E)²/E</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.goodnessOfFit.map((g) => (
                      <tr key={g.category}>
                        <td><strong>{g.category}</strong></td>
                        <td className="num">{g.observed}</td>
                        <td className="num">{fmt(g.expected, 2)}</td>
                        <td className="num">{fmtFixed(g.contribution, 3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {r.effectSize && (
            <Card title="Effect size">
              <p className="fx-note" style={{ margin: 0 }}>
                {r.effectSize.name}: <b>{fmtFixed(r.effectSize.value, 3)}</b>
              </p>
            </Card>
          )}

          <Card title="Assumptions">
            <ul className="us-assume">
              {r.assumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {r.contingency && (
        <Card
          title="Contingency table"
          subtitle={`Observed counts (expected counts in grey) for ${r.contingency.rowName} × ${r.contingency.colName}`}
        >
          <div className="fx-table-wrap">
            <table className="fx-table">
              <thead>
                <tr>
                  <th>{r.contingency.rowName} ↓ / {r.contingency.colName} →</th>
                  {r.contingency.cols.map((c) => (
                    <th className="num" key={c}>{c}</th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {r.contingency.rows.map((row, i) => (
                  <tr key={row}>
                    <td><strong>{row}</strong></td>
                    {r.contingency.cols.map((c, j) => (
                      <td className="num" key={c}>
                        {r.contingency.observed[i][j]}
                        <small className="us-expected"> ({fmt(r.contingency.expected[i][j], 1)})</small>
                      </td>
                    ))}
                    <td className="num"><strong>{r.contingency.rowTotals[i]}</strong></td>
                  </tr>
                ))}
                <tr>
                  <td><strong>Total</strong></td>
                  {r.contingency.colTotals.map((t, j) => (
                    <td className="num" key={j}><strong>{t}</strong></td>
                  ))}
                  <td className="num"><strong>{r.contingency.total}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

export default function UpdatedStatistics() {
  const { data: options, error: optionsError } = useApi("/hypothesis/options");
  const [test, setTest] = useState("z");
  const [draft, setDraft] = useState(null);
  const [applied, setApplied] = useState(null);

  const effectiveDraft = draft ?? (options ? defaultsFor(test, options) : null);
  const effectiveApplied = applied ?? effectiveDraft;

  const params = effectiveApplied ? { test, ...effectiveApplied } : null;
  const { data: result, error, loading } = useApi("/hypothesis/run", params, Boolean(params));

  function chooseTest(key) {
    setTest(key);
    setDraft(null);
    setApplied(null);
  }

  const set = (patch) => setDraft({ ...effectiveDraft, ...patch });
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(effectiveApplied);
  const groups = options ? [...new Set(options.tests.map((t) => t.group))] : [];

  return (
    <div className="fx">
      <Header
        title="Updated Statistical Analysis"
        subtitle="Runs the classical hypothesis tests on your sales data and reports the decision for you: Z-test, t-tests, F-test, ANOVA and chi-square tests. Choose a test, set your hypothesis and significance level, and the page calculates the statistic, p-value and conclusion."
        badge="7 tests"
      />

      {optionsError && <div className="fx-state fx-state--error">{optionsError}</div>}

      {options && (
        <>
          <div className="us-tests">
            {groups.map((g) => (
              <div className="us-test-group" key={g}>
                <span>{g}</span>
                <div className="fx-chips">
                  {options.tests
                    .filter((t) => t.group === g)
                    .map((t) => (
                      <button
                        type="button"
                        key={t.key}
                        className={`fx-chip ${test === t.key ? "active" : ""}`}
                        onClick={() => chooseTest(t.key)}
                        title={t.description}
                      >
                        {t.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>

          <div className="fx-controls">
            <Controls test={test} draft={effectiveDraft} set={set} options={options} />
            <button
              type="button"
              className="us-run"
              disabled={!dirty}
              onClick={() => setApplied(draft)}
            >
              {dirty ? "Run test" : "Up to date"}
            </button>
          </div>

          <Status loading={loading} error={error}>
            {result && <Results r={result} />}
          </Status>
        </>
      )}
    </div>
  );
}

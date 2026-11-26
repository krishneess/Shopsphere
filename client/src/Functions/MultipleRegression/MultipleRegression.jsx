import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
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
  fmtP,
} from "../shared/ui";

export default function MultipleRegression() {
  const { data: fieldData } = useApi("/regression/fields");
  const [y, setY] = useState("unitPrice");
  const [xs, setXs] = useState(["quantity", "unitCost"]);
  const [inputs, setInputs] = useState({});

  const fields = fieldData?.fields || [];
  const ready = xs.length >= 2;
  const { data, error, loading } = useApi(
    "/regression/multiple",
    { y, x: xs.join(",") },
    ready
  );

  function toggle(key) {
    setXs((current) =>
      current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    );
  }

  function changeTarget(key) {
    setY(key);
    setXs((current) => current.filter((k) => k !== key));
  }

  const intercept = data?.coefficients[0];
  const slopes = data?.coefficients.slice(1) || [];

  const prediction =
    data && slopes.every((c, i) => Number.isFinite(Number(inputs[data.predictors[i].key])) && inputs[data.predictors[i].key] !== undefined && inputs[data.predictors[i].key] !== "")
      ? intercept.coefficient +
        slopes.reduce((s, c, i) => s + c.coefficient * Number(inputs[data.predictors[i].key]), 0)
      : null;

  const equation = data
    ? `${data.target.label} = ${fmt(intercept.coefficient, 3)}` +
      slopes
        .map((c) => ` ${c.coefficient < 0 ? "−" : "+"} ${fmt(Math.abs(c.coefficient), 3)} × ${c.name}`)
        .join("")
    : "";

  const betaData = slopes.map((c) => ({ name: c.name, beta: c.standardized }));
  const strongest = [...slopes].sort((a, b) => Math.abs(b.standardized) - Math.abs(a.standardized))[0];
  const highVif = data?.vif.filter((v) => v.vif === null || v.vif > 10) || [];

  return (
    <div className="fx">
      <Header
        eyebrow="Regression · Function 06"
        title="Multiple Linear Regression"
        subtitle="Predicts a numeric target from two or more predictors at once. Coefficients are solved exactly with the normal equations b = (XᵀX)⁻¹Xᵀy."
        badge={`${xs.length} predictors`}
      />

      <div className="fx-controls">
        <Field label="Target (Y)">
          <select value={y} onChange={(e) => changeTarget(e.target.value)}>
            {fields.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="fx-field" style={{ flex: 1 }}>
          <span>Predictors (X) — pick at least two</span>
          <div className="fx-chips">
            {fields
              .filter((f) => f.key !== y)
              .map((f) => (
                <button
                  type="button"
                  key={f.key}
                  className={`fx-chip ${xs.includes(f.key) ? "active" : ""}`}
                  onClick={() => toggle(f.key)}
                  aria-pressed={xs.includes(f.key)}
                >
                  {xs.includes(f.key) ? "✓ " : ""}
                  {f.label}
                </button>
              ))}
          </div>
        </div>
      </div>

      {!ready && <div className="fx-state">Select at least two predictors to fit the model.</div>}

      {ready && (
        <Status loading={loading} error={error}>
          {data && (
            <>
              <div className="fx-equation">
                <span>Fitted model</span>
                <code>{equation}</code>
              </div>

              <Kpis
                items={[
                  { label: "R²", value: fmtFixed(data.metrics.r2, 4), note: `${fmt(data.metrics.r2 * 100, 1)}% of variation explained` },
                  { label: "Adjusted R²", value: fmtFixed(data.metrics.adjustedR2, 4), note: "Penalises extra predictors" },
                  { label: "RMSE", value: fmt(data.metrics.rmse, 2), note: `MAE ${fmt(data.metrics.mae, 2)}` },
                  { label: "F-test p-value", value: fmtP(data.metrics.fPValue), note: `F = ${fmt(data.metrics.fStatistic, 2)}` },
                  { label: "Records used", value: data.n, note: `${data.degreesOfFreedom} degrees of freedom` },
                ]}
              />

              <Insight>
                The model explains <b>{fmt(data.metrics.r2 * 100, 1)}%</b> of the variation in {data.target.label}
                {data.metrics.fPValue < 0.05 ? " and is statistically significant overall." : ", but is not statistically significant overall."}{" "}
                {strongest && (
                  <>
                    The most influential predictor (largest standardised effect) is <b>{strongest.name}</b>.
                  </>
                )}
                {highVif.length > 0 && (
                  <>
                    {" "}Warning: <b>{highVif.map((v) => v.name).join(", ")}</b> show high multicollinearity (VIF &gt; 10), so their individual coefficients may be unreliable.
                  </>
                )}
              </Insight>

              <Card title="Coefficients" subtitle="Effect of each predictor while holding the others constant.">
                <div className="fx-table-wrap">
                  <table className="fx-table">
                    <thead>
                      <tr>
                        <th>Term</th>
                        <th className="num">Coefficient</th>
                        <th className="num">Std. error</th>
                        <th className="num">t</th>
                        <th className="num">p-value</th>
                        <th className="num">95% CI</th>
                        <th className="num">Std. beta</th>
                        <th className="num">VIF</th>
                        <th>Significant?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.coefficients.map((c, i) => {
                        const vif = i === 0 ? null : data.vif[i - 1]?.vif;
                        return (
                          <tr key={c.name}>
                            <td><strong>{c.name}</strong></td>
                            <td className="num">{fmt(c.coefficient, 4)}</td>
                            <td className="num">{fmt(c.standardError, 4)}</td>
                            <td className="num">{fmt(c.tStatistic, 2)}</td>
                            <td className="num">{fmtP(c.pValue)}</td>
                            <td className="num">{fmt(c.ci95[0], 3)} to {fmt(c.ci95[1], 3)}</td>
                            <td className="num">{c.standardized === null ? "—" : fmtFixed(c.standardized, 3)}</td>
                            <td className="num">{i === 0 ? "—" : vif === null ? "∞" : fmt(vif, 2)}</td>
                            <td>
                              <span className={`fx-sig ${c.pValue < 0.05 ? "yes" : "no"}`}>
                                {c.pValue < 0.05 ? "Yes (p < 0.05)" : "No"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="fx-note">
                  Standardised beta compares predictors on one scale (effect in standard deviations of Y per standard
                  deviation of X). A VIF above 5–10 signals that a predictor is largely explained by the others.
                </p>
              </Card>

              <div className="fx-grid-2">
                <Card title="Actual vs predicted" subtitle="Points on the dashed diagonal are perfect predictions.">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="actual" name="Actual" tick={axisTick} domain={["auto", "auto"]} label={{ value: `Actual ${data.target.label}`, position: "insideBottom", offset: -16, fill: "var(--text-secondary)", fontSize: 12 }} />
                      <YAxis type="number" dataKey="predicted" name="Predicted" tick={axisTick} domain={["auto", "auto"]} width={60} label={{ value: "Predicted", angle: -90, position: "insideLeft", fill: "var(--text-secondary)", fontSize: 12 }} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} {...chartTooltip} />
                      <Scatter name="Records" data={data.points} fill="var(--accent)" fillOpacity={0.55} />
                      <Scatter
                        name="Perfect fit"
                        data={(() => {
                          const vals = data.points.map((p) => p.actual);
                          const lo = Math.min(...vals);
                          const hi = Math.max(...vals);
                          return [{ actual: lo, predicted: lo }, { actual: hi, predicted: hi }];
                        })()}
                        line={{ stroke: "#e0707a", strokeWidth: 2, strokeDasharray: "6 4" }}
                        shape={() => null}
                        legendType="none"
                        isAnimationActive={false}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Residuals" subtitle="Errors should scatter randomly around zero.">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                      <XAxis type="number" dataKey="predicted" name="Predicted" tick={axisTick} domain={["auto", "auto"]} label={{ value: "Predicted value", position: "insideBottom", offset: -16, fill: "var(--text-secondary)", fontSize: 12 }} />
                      <YAxis type="number" dataKey="residual" name="Residual" tick={axisTick} width={60} />
                      <ReferenceLine y={0} stroke="#e0707a" strokeWidth={2} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} {...chartTooltip} />
                      <Scatter name="Residuals" data={data.points} fill="var(--accent)" fillOpacity={0.55} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <div className="fx-grid-2">
                <Card title="Predictor influence" subtitle="Standardised coefficients — longer bars mean a stronger effect.">
                  <ResponsiveContainer width="100%" height={Math.max(180, betaData.length * 52)}>
                    <BarChart data={betaData} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 10 }}>
                      <CartesianGrid stroke="var(--border)" horizontal={false} />
                      <XAxis type="number" tick={axisTick} />
                      <YAxis type="category" dataKey="name" tick={axisTick} width={96} />
                      <ReferenceLine x={0} stroke="var(--border-strong)" />
                      <Tooltip formatter={(v) => fmtFixed(v, 3)} cursor={{ fill: "var(--surface-hover)" }} {...chartTooltip} />
                      <Bar dataKey="beta" name="Std. beta" radius={4}>
                        {betaData.map((d) => (
                          <Cell key={d.name} fill={d.beta >= 0 ? "var(--accent)" : "#e0707a"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card title="Try a prediction" subtitle={`Enter values to estimate ${data.target.label}.`}>
                  <div className="fx-calc">
                    {data.predictors.map((p) => (
                      <Field key={p.key} label={p.label}>
                        <input
                          type="number"
                          value={inputs[p.key] ?? ""}
                          placeholder="value"
                          onChange={(e) => setInputs((cur) => ({ ...cur, [p.key]: e.target.value }))}
                        />
                      </Field>
                    ))}
                    <div className="fx-calc-result">
                      Predicted {data.target.label}
                      <strong>{prediction === null ? "—" : fmt(prediction, 2)}</strong>
                    </div>
                  </div>
                  <p className="fx-note">
                    Method: ŷ = b₀ + b₁x₁ + … + bₖxₖ. The coefficients minimise the sum of squared residuals
                    (SSE = {fmt(data.metrics.sse, 1)}) across all {data.n} records.
                  </p>
                </Card>
              </div>
            </>
          )}
        </Status>
      )}
    </div>
  );
}

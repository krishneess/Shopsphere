import { useState } from "react";
import {
  CartesianGrid,
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

export default function SimpleRegression() {
  const { data: fieldData } = useApi("/regression/fields");
  const [x, setX] = useState("unitCost");
  const [y, setY] = useState("unitPrice");
  const [input, setInput] = useState("");

  const { data, error, loading } = useApi("/regression/simple", { x, y });
  const fields = fieldData?.fields || [];

  const slope = data?.coefficients.slope;
  const intercept = data?.coefficients.intercept;
  const sign = intercept < 0 ? "−" : "+";
  const significant = data && data.pValues.slope < 0.05;
  const prediction =
    data && input !== "" && Number.isFinite(Number(input))
      ? intercept + slope * Number(input)
      : null;

  return (
    <div className="fx">
      <Header
        eyebrow="Regression · Function 05"
        title="Simple Linear Regression"
        subtitle="Models how one numeric variable (the predictor, X) explains another (the target, Y) with a straight line fitted by ordinary least squares."
        badge="1 predictor"
      />

      <div className="fx-controls">
        <Field label="Predictor (X)">
          <select value={x} onChange={(e) => setX(e.target.value)}>
            {fields.map((f) => (
              <option key={f.key} value={f.key} disabled={f.key === y}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Target (Y)">
          <select value={y} onChange={(e) => setY(e.target.value)}>
            {fields.map((f) => (
              <option key={f.key} value={f.key} disabled={f.key === x}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Status loading={loading} error={error}>
        {data && (
          <>
            <div className="fx-equation">
              <span>Fitted model</span>
              <code>
                {data.target.label} = {fmt(intercept, 4)} {sign} {fmt(Math.abs(slope), 4)} × {data.predictor.label}
              </code>
            </div>

            <Kpis
              items={[
                { label: "R² (explained variance)", value: fmtFixed(data.metrics.r2, 4), note: `${fmt(data.metrics.r2 * 100, 1)}% of variation explained` },
                { label: "Correlation (r)", value: fmtFixed(data.metrics.correlation, 4), note: data.metrics.correlation >= 0 ? "Positive relationship" : "Negative relationship" },
                { label: "RMSE", value: fmt(data.metrics.rmse, 2), note: `MAE ${fmt(data.metrics.mae, 2)}` },
                { label: "Slope p-value", value: fmtP(data.pValues.slope), note: significant ? "Significant at 5%" : "Not significant at 5%" },
                { label: "Records used", value: data.n, note: `${data.degreesOfFreedom} degrees of freedom` },
              ]}
            />

            <Insight>
              For every 1-unit increase in <b>{data.predictor.label}</b>,{" "}
              <b>{data.target.label}</b> changes by about <b>{fmt(slope, 4)}</b> (95% CI{" "}
              {fmt(data.slopeConfidenceInterval95[0], 4)} to {fmt(data.slopeConfidenceInterval95[1], 4)}). The line explains{" "}
              <b>{fmt(data.metrics.r2 * 100, 1)}%</b> of the variation in {data.target.label}
              {significant ? ", and the relationship is statistically significant." : ", but the relationship is not statistically significant."}
            </Insight>

            <div className="fx-grid-2">
              <Card title="Scatter plot with regression line" subtitle="Each dot is one sales record; the line is the least-squares fit.">
                <ResponsiveContainer width="100%" height={320}>
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="x" name={data.predictor.label} tick={axisTick} domain={["auto", "auto"]} label={{ value: data.predictor.label, position: "insideBottom", offset: -16, fill: "var(--text-secondary)", fontSize: 12 }} />
                    <YAxis type="number" dataKey="y" name={data.target.label} tick={axisTick} domain={["auto", "auto"]} width={60} label={{ value: data.target.label, angle: -90, position: "insideLeft", fill: "var(--text-secondary)", fontSize: 12 }} />
                    <Tooltip cursor={{ strokeDasharray: "3 3" }} {...chartTooltip} />
                    <Scatter name="Records" data={data.points} fill="var(--accent)" fillOpacity={0.55} />
                    <Scatter
                      name="Regression line"
                      data={data.line}
                      line={{ stroke: "#e0707a", strokeWidth: 2.5 }}
                      shape={() => null}
                      legendType="none"
                      isAnimationActive={false}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Residual plot" subtitle="Residual = actual − predicted. A good fit scatters evenly around zero with no pattern.">
                <ResponsiveContainer width="100%" height={320}>
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

            <div className="fx-grid-2 fx-grid-2--wide">
              <Card title="Worked calculation" subtitle="The least-squares formulas applied to your data, step by step.">
                <ol className="fx-steps">
                  <li>
                    <div>
                      <b>Means</b>
                      <code>x̄ = {fmt(data.means.x, 4)} ,  ȳ = {fmt(data.means.y, 4)}  (n = {data.n})</code>
                    </div>
                  </li>
                  <li>
                    <div>
                      <b>Sums of squares and cross-products</b>
                      <code>Sxx = Σ(x − x̄)² = {fmt(data.sums.sxx, 2)}</code>
                      <code>Sxy = Σ(x − x̄)(y − ȳ) = {fmt(data.sums.sxy, 2)}</code>
                    </div>
                  </li>
                  <li>
                    <div>
                      <b>Slope</b>
                      <code>b₁ = Sxy / Sxx = {fmt(data.sums.sxy, 2)} / {fmt(data.sums.sxx, 2)} = {fmt(slope, 6)}</code>
                    </div>
                  </li>
                  <li>
                    <div>
                      <b>Intercept</b>
                      <code>b₀ = ȳ − b₁·x̄ = {fmt(data.means.y, 4)} − {fmt(slope, 4)} × {fmt(data.means.x, 4)} = {fmt(intercept, 6)}</code>
                    </div>
                  </li>
                  <li>
                    <div>
                      <b>Goodness of fit</b>
                      <code>R² = SSR / SST = {fmt(data.metrics.ssr, 1)} / {fmt(data.metrics.sst, 1)} = {fmtFixed(data.metrics.r2, 4)}</code>
                    </div>
                  </li>
                  <li>
                    <div>
                      <b>Significance of the slope</b>
                      <code>SE(b₁) = s / √Sxx = {fmt(data.standardErrors.slope, 6)} ,  t = b₁ / SE = {fmt(data.tStatistics.slope, 2)} ,  p {fmtP(data.pValues.slope).startsWith("<") ? "" : "= "}{fmtP(data.pValues.slope)}</code>
                    </div>
                  </li>
                </ol>
              </Card>

              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <Card title="Coefficients">
                  <div className="fx-table-wrap">
                    <table className="fx-table">
                      <thead>
                        <tr>
                          <th>Term</th>
                          <th className="num">Estimate</th>
                          <th className="num">Std. error</th>
                          <th className="num">t</th>
                          <th className="num">p-value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Intercept (b₀)</td>
                          <td className="num">{fmt(intercept, 4)}</td>
                          <td className="num">{fmt(data.standardErrors.intercept, 4)}</td>
                          <td className="num">{fmt(data.tStatistics.intercept, 2)}</td>
                          <td className="num">{fmtP(data.pValues.intercept)}</td>
                        </tr>
                        <tr>
                          <td>{data.predictor.label} (b₁)</td>
                          <td className="num">{fmt(slope, 4)}</td>
                          <td className="num">{fmt(data.standardErrors.slope, 4)}</td>
                          <td className="num">{fmt(data.tStatistics.slope, 2)}</td>
                          <td className="num">{fmtP(data.pValues.slope)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                <Card title="Try a prediction" subtitle={`Enter a value of ${data.predictor.label} to estimate ${data.target.label}.`}>
                  <div className="fx-calc">
                    <Field label={data.predictor.label}>
                      <input type="number" value={input} placeholder="e.g. 500" onChange={(e) => setInput(e.target.value)} />
                    </Field>
                    <div className="fx-calc-result">
                      Predicted {data.target.label}
                      <strong>{prediction === null ? "—" : fmt(prediction, 2)}</strong>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </Status>
    </div>
  );
}

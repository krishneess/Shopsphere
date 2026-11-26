import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import useApi from "./useApi";
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
} from "./ui";

const CLASS_COLORS = ["var(--accent)", "#e0a24f", "#5aa9c9", "#d4635f"];

const MODES = {
  gainRatio: {
    eyebrow: "Decision Trees · Function 08",
    title: "Gain Ratio",
    subtitle:
      "Gain Ratio (used by C4.5) improves on Information Gain by dividing it by Split Info, so attributes with many distinct values are not unfairly favoured. The attribute with the highest ratio is the best split.",
    badge: "Entropy-based",
    metric: "gainRatio",
    metricLabel: "Gain ratio",
    chartTitle: "Attributes ranked by Gain Ratio",
    chartSub: "Higher is better. Gain Ratio = Information Gain ÷ Split Info.",
  },
  gini: {
    eyebrow: "Decision Trees · Function 09",
    title: "Gini Index",
    subtitle:
      "The Gini Index (used by CART) measures how mixed the classes are inside each group. The best split is the attribute that gives the lowest weighted Gini, i.e. the biggest impurity reduction.",
    badge: "Impurity-based",
    metric: "giniGain",
    metricLabel: "Gini gain",
    chartTitle: "Attributes ranked by Gini Gain",
    chartSub: "Higher is better. Gini Gain = Gini(parent) − weighted Gini after the split.",
  },
};

function ClassBar({ classes, counts, total }) {
  return (
    <span className="fx-classbar" title={classes.map((c) => `${c}: ${counts[c]}`).join(" · ")}>
      {classes.map((c, i) => (
        <i key={c} style={{ width: `${total ? (counts[c] / total) * 100 : 0}%`, background: CLASS_COLORS[i % CLASS_COLORS.length] }} />
      ))}
    </span>
  );
}

export default function AttributeAnalysis({ mode }) {
  const cfg = MODES[mode];
  const [target, setTarget] = useState("profitLevel");
  const [selected, setSelected] = useState(null);

  const { data, error, loading } = useApi("/mining/decision-metrics", { target });

  const ranked = data
    ? [...data.attributes].sort((a, b) =>
        mode === "gainRatio" ? b.gainRatio - a.gainRatio || b.infoGain - a.infoGain : a.weightedGini - b.weightedGini
      )
    : [];
  const best = ranked[0];
  const active = (data && ranked.find((a) => a.attribute === selected)) || best;
  const isGain = mode === "gainRatio";

  return (
    <div className="fx">
      <Header eyebrow={cfg.eyebrow} title={cfg.title} subtitle={cfg.subtitle} badge={cfg.badge} />

      <div className="fx-controls">
        <Field label="Class label to predict">
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              setSelected(null);
            }}
          >
            {(data?.targets || [{ key: "profitLevel", label: "Profit Level" }]).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <p className="fx-note" style={{ margin: 0, flex: 1, minWidth: 220 }}>
          {data?.target.description}
        </p>
      </div>

      <Status loading={loading} error={error}>
        {data && best && (
          <>
            <Kpis
              items={[
                { label: "Records", value: data.totalRecords, note: `${data.attributes.length} candidate attributes` },
                ...data.classes.map((c) => ({
                  label: `Class: ${c}`,
                  value: data.classCounts[c],
                  note: `${fmt((data.classCounts[c] / data.totalRecords) * 100, 1)}% of records`,
                })),
                isGain
                  ? { label: "Parent entropy", value: fmtFixed(data.parentEntropy, 4), note: "Info(D) in bits" }
                  : { label: "Parent Gini", value: fmtFixed(data.parentGini, 4), note: "Gini(D) before any split" },
              ]}
            />

            <Insight>
              Best attribute to split on: <b>{best.attribute}</b> —{" "}
              {isGain ? (
                <>
                  Gain Ratio <b>{fmtFixed(best.gainRatio, 4)}</b> (Information Gain {fmtFixed(best.infoGain, 4)} ÷ Split Info{" "}
                  {fmtFixed(best.splitInfo, 4)}).
                </>
              ) : (
                <>
                  weighted Gini <b>{fmtFixed(best.weightedGini, 4)}</b>, reducing impurity by {fmtFixed(best.giniGain, 4)} from{" "}
                  {fmtFixed(data.parentGini, 4)}.
                </>
              )}{" "}
              {isGain &&
                data.attributes.length > 1 &&
                (() => {
                  const topGain = [...data.attributes].sort((a, b) => b.infoGain - a.infoGain)[0];
                  return topGain.attribute !== best.attribute ? (
                    <>
                      Plain Information Gain would have picked <b>{topGain.attribute}</b> ({topGain.distinctValues} distinct values) —
                      Gain Ratio corrects that bias.
                    </>
                  ) : null;
                })()}
            </Insight>

            <div className="fx-grid-2 fx-grid-2--wide">
              <Card title={cfg.chartTitle} subtitle={cfg.chartSub}>
                <ResponsiveContainer width="100%" height={Math.max(260, ranked.length * 42)}>
                  <BarChart
                    data={ranked.map((a) => ({ name: a.attribute, value: a[cfg.metric] }))}
                    layout="vertical"
                    margin={{ top: 4, right: 24, bottom: 4, left: 10 }}
                  >
                    <CartesianGrid stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={axisTick} />
                    <YAxis type="category" dataKey="name" tick={axisTick} width={100} />
                    <Tooltip formatter={(v) => fmtFixed(v, 4)} cursor={{ fill: "var(--surface-hover)" }} {...chartTooltip} />
                    <Bar dataKey="value" name={cfg.metricLabel} radius={4}>
                      {ranked.map((a, i) => (
                        <Cell key={a.attribute} fill={i === 0 ? "var(--accent)" : "var(--border-strong)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Attribute comparison" subtitle="Click a row to see its full calculation below.">
                <div className="fx-table-wrap">
                  <table className="fx-table">
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th className="num">Values</th>
                        {isGain ? (
                          <>
                            <th className="num">Info gain</th>
                            <th className="num">Split info</th>
                            <th className="num">Gain ratio</th>
                          </>
                        ) : (
                          <>
                            <th className="num">Weighted Gini</th>
                            <th className="num">Gini gain</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((a, i) => (
                        <tr
                          key={a.attribute}
                          className={`clickable ${a.attribute === active.attribute ? "selected" : ""} ${i === 0 ? "best" : ""}`}
                          onClick={() => setSelected(a.attribute)}
                        >
                          <td><strong>{a.attribute}</strong></td>
                          <td className="num">{a.distinctValues}</td>
                          {isGain ? (
                            <>
                              <td className="num">{fmtFixed(a.infoGain, 4)}</td>
                              <td className="num">{fmtFixed(a.splitInfo, 4)}</td>
                              <td className="num"><strong>{fmtFixed(a.gainRatio, 4)}</strong></td>
                            </>
                          ) : (
                            <>
                              <td className="num"><strong>{fmtFixed(a.weightedGini, 4)}</strong></td>
                              <td className="num">{fmtFixed(a.giniGain, 4)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <Card
              title={`Calculation for “${active.attribute}”`}
              subtitle={`The records are split into ${active.distinctValues} groups by ${active.attribute}; each group's class mix drives the score.`}
            >
              <div className="fx-table-wrap">
                <table className="fx-table">
                  <thead>
                    <tr>
                      <th>{active.attribute}</th>
                      <th className="num">Records</th>
                      <th className="num">Weight</th>
                      {data.classes.map((c) => (
                        <th className="num" key={c}>{c}</th>
                      ))}
                      <th>Class mix</th>
                      <th className="num">{isGain ? "Entropy" : "Gini"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.partitions.map((p) => (
                      <tr key={p.value}>
                        <td><strong>{p.value}</strong></td>
                        <td className="num">{p.count}</td>
                        <td className="num">{fmtFixed(p.weight, 3)}</td>
                        {data.classes.map((c) => (
                          <td className="num" key={c}>{p.classCounts[c]}</td>
                        ))}
                        <td><ClassBar classes={data.classes} counts={p.classCounts} total={p.count} /></td>
                        <td className="num">{fmtFixed(isGain ? p.entropy : p.gini, 4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="fx-legend">
                {data.classes.map((c, i) => (
                  <span key={c}>
                    <b style={{ background: CLASS_COLORS[i % CLASS_COLORS.length] }} />
                    {c}
                  </span>
                ))}
              </div>

              <ol className="fx-steps" style={{ marginTop: 22 }}>
                {isGain ? (
                  <>
                    <li>
                      <div>
                        <b>Entropy of the whole dataset</b>
                        <code>Info(D) = −Σ pᵢ·log₂(pᵢ) = {fmtFixed(data.parentEntropy, 4)} bits</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Expected entropy after splitting on {active.attribute}</b>
                        <code>Info_A(D) = Σ (|Dⱼ|/|D|) · Info(Dⱼ) = {fmtFixed(active.expectedEntropy, 4)}</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Information Gain</b>
                        <code>Gain(A) = Info(D) − Info_A(D) = {fmtFixed(data.parentEntropy, 4)} − {fmtFixed(active.expectedEntropy, 4)} = {fmtFixed(active.infoGain, 4)}</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Split Info (how finely the attribute fragments the data)</b>
                        <code>SplitInfo(A) = −Σ (|Dⱼ|/|D|)·log₂(|Dⱼ|/|D|) = {fmtFixed(active.splitInfo, 4)}</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Gain Ratio</b>
                        <code>GainRatio(A) = Gain(A) / SplitInfo(A) = {fmtFixed(active.infoGain, 4)} / {fmtFixed(active.splitInfo, 4)} = {fmtFixed(active.gainRatio, 4)}</code>
                      </div>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <div>
                        <b>Gini of the whole dataset</b>
                        <code>Gini(D) = 1 − Σ pᵢ² = {fmtFixed(data.parentGini, 4)}</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Gini of each group</b>
                        <code>Gini(Dⱼ) = 1 − Σ pᵢⱼ²  (shown in the table above)</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Weighted Gini after splitting on {active.attribute}</b>
                        <code>Gini_A(D) = Σ (|Dⱼ|/|D|) · Gini(Dⱼ) = {fmtFixed(active.weightedGini, 4)}</code>
                      </div>
                    </li>
                    <li>
                      <div>
                        <b>Impurity reduction (Gini gain)</b>
                        <code>ΔGini(A) = Gini(D) − Gini_A(D) = {fmtFixed(data.parentGini, 4)} − {fmtFixed(active.weightedGini, 4)} = {fmtFixed(active.giniGain, 4)}</code>
                      </div>
                    </li>
                  </>
                )}
              </ol>
              <p className="fx-note">
                Numeric columns (price, cost) are converted to Low / Medium / High bands using equal-frequency terciles
                before scoring. Scores are computed at the root node of a decision tree.
              </p>
            </Card>
          </>
        )}
      </Status>
    </div>
  );
}

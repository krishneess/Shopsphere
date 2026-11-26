// Classical hypothesis tests: Z-test, one- and two-sample t-tests, F-test,
// one-way ANOVA and chi-square tests. Each returns the same result shape so
// the client can render them with one component.
const { mean, round, tTwoSidedP, fUpperP, tCritical } = require("./mathUtils");
const D = require("./distributions");

const f4 = (v, d = 4) => (Number.isFinite(v) ? Number(v.toFixed(d)).toLocaleString("en-US", { maximumFractionDigits: d }) : "—");

function summarize(values, label) {
    const n = values.length;
    const m = mean(values);
    const variance = n > 1 ? values.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1) : 0;
    return { label, n, mean: round(m, 4), variance: round(variance, 4), sd: round(Math.sqrt(variance), 4), _m: m, _v: variance };
}

const publicGroup = ({ _m, _v, ...rest }) => rest;

const ALT_TEXT = { two: "≠", greater: ">", less: "<" };

// ---- Density curve with the rejection region highlighted -------------------
function buildCurve(kind, params, statistic, regions) {
    const pdf = (x) =>
        kind === "normal" ? D.normalPdf(x)
        : kind === "t" ? D.tPdf(x, params.df)
        : kind === "chi" ? D.chiSquarePdf(x, params.df)
        : D.fPdf(x, params.df1, params.df2);

    let lo;
    let hi;
    if (kind === "normal" || kind === "t") {
        const span = Math.min(Math.max(4.5, Math.abs(statistic) * 1.15), 14);
        lo = -span;
        hi = span;
    } else {
        lo = 0;
        const crit = regions.flat().filter((v) => Number.isFinite(v));
        hi = Math.max(statistic * 1.2, (crit.length ? Math.max(...crit) : 1) * 1.6, 3);
        if (kind === "f") hi = Math.min(hi, 12);
    }

    const points = [];
    const N = 160;
    for (let i = 0; i <= N; i++) {
        const x = lo + ((hi - lo) * i) / N;
        const y = pdf(x);
        const inRegion = regions.some(([a, b]) => x >= a && x <= b);
        points.push({ x: round(x, 4), y: round(y, 6), reject: inRegion ? round(y, 6) : null });
    }
    return { kind, points, statistic: round(statistic, 4), range: [lo, hi] };
}

function decide(pValue, alpha, h0, h1) {
    const reject = pValue < alpha;
    const p = round(pValue, 6);
    const shown = p < 0.0001 ? "< 0.0001" : `= ${p.toFixed(4)}`;
    return {
        reject,
        text: reject
            ? `p ${shown}, which is below α = ${alpha}. There is statistically significant evidence for H₁: ${h1}.`
            : `p ${shown}, which is not below α = ${alpha}. There is not enough evidence against H₀: ${h0}.`,
    };
}

function tailP(alt, cdfLower, cdfUpper) {
    return alt === "two" ? Math.min(1, 2 * Math.min(cdfLower, cdfUpper)) : alt === "greater" ? cdfUpper : cdfLower;
}

function meanRegions(alt, c) {
    return alt === "two" ? [[-Infinity, -c], [c, Infinity]] : alt === "greater" ? [[c, Infinity]] : [[-Infinity, -c]];
}

// ---------------------------------------------------------------------------
// Z-test (one sample, known sigma)
// ---------------------------------------------------------------------------
function zTest({ values, label, mu0, sigma, sigmaSource, alpha, alt }) {
    const s = summarize(values, label);
    if (s.n < 2) throw new Error("At least 2 records are required.");
    if (!(sigma > 0)) throw new Error("Standard deviation (σ) must be greater than 0.");

    const se = sigma / Math.sqrt(s.n);
    const z = (s._m - mu0) / se;
    const p = tailP(alt, D.normalCdf(z), 1 - D.normalCdf(z));
    const c = D.normalCritical(alt === "two" ? alpha / 2 : alpha);
    const h0 = `μ = ${f4(mu0, 2)}`;
    const h1 = `μ ${ALT_TEXT[alt]} ${f4(mu0, 2)}`;

    return {
        test: "z",
        title: "One-sample Z-test",
        question: `Is the mean ${label} ${alt === "two" ? "different from" : alt === "greater" ? "greater than" : "less than"} ${f4(mu0, 2)}?`,
        alpha, alternative: alt,
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "z", value: round(z) },
        df: null,
        pValue: round(p, 6),
        critical: alt === "two" ? [-round(c), round(c)] : [alt === "greater" ? round(c) : -round(c)],
        ...decide(p, alpha, h0, h1),
        groups: [publicGroup(s)],
        assumptions: [
            `σ = ${f4(sigma, 4)} is treated as known (${sigmaSource}).`,
            "Records are independent; with n ≥ 30 the sample mean is approximately normal (Central Limit Theorem).",
        ],
        steps: [
            { label: "Sample statistics", formula: `n = ${s.n},  x̄ = ${f4(s._m)},  σ = ${f4(sigma)}` },
            { label: "Standard error", formula: `SE = σ / √n = ${f4(sigma)} / √${s.n} = ${f4(se)}` },
            { label: "Test statistic", formula: `z = (x̄ − μ₀) / SE = (${f4(s._m)} − ${f4(mu0, 2)}) / ${f4(se)} = ${f4(z)}` },
            { label: "Critical value", formula: `z_crit = ${alt === "two" ? "±" : alt === "less" ? "−" : ""}${f4(c)}  (α = ${alpha}, ${alt === "two" ? "two-tailed" : "one-tailed"})` },
            { label: "p-value", formula: `p = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("normal", {}, z, meanRegions(alt, c)),
    };
}

// ---------------------------------------------------------------------------
// One-sample t-test
// ---------------------------------------------------------------------------
function oneSampleT({ values, label, mu0, alpha, alt }) {
    const s = summarize(values, label);
    if (s.n < 2) throw new Error("At least 2 records are required.");
    if (s._v === 0) throw new Error("All values are identical, so the t statistic is undefined.");

    const df = s.n - 1;
    const se = Math.sqrt(s._v / s.n);
    const t = (s._m - mu0) / se;
    const two = tTwoSidedP(t, df);
    const p = alt === "two" ? two : (alt === "greater") === t >= 0 ? two / 2 : 1 - two / 2;
    const c = alt === "two" ? tCritical(df, alpha) : D.tCriticalOneTail(alpha, df);
    const h0 = `μ = ${f4(mu0, 2)}`;
    const h1 = `μ ${ALT_TEXT[alt]} ${f4(mu0, 2)}`;

    return {
        test: "t1",
        title: "One-sample t-test",
        question: `Is the mean ${label} ${alt === "two" ? "different from" : alt === "greater" ? "greater than" : "less than"} ${f4(mu0, 2)}?`,
        alpha, alternative: alt,
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "t", value: round(t) },
        df, pValue: round(p, 6),
        critical: alt === "two" ? [-round(c), round(c)] : [alt === "greater" ? round(c) : -round(c)],
        ...decide(p, alpha, h0, h1),
        groups: [publicGroup(s)],
        assumptions: [
            "σ is unknown, so the sample standard deviation is used and the t-distribution applies.",
            "Records are independent and the mean is approximately normal (reasonable for larger n).",
        ],
        steps: [
            { label: "Sample statistics", formula: `n = ${s.n},  x̄ = ${f4(s._m)},  s = ${f4(Math.sqrt(s._v))}` },
            { label: "Standard error", formula: `SE = s / √n = ${f4(Math.sqrt(s._v))} / √${s.n} = ${f4(se)}` },
            { label: "Test statistic", formula: `t = (x̄ − μ₀) / SE = (${f4(s._m)} − ${f4(mu0, 2)}) / ${f4(se)} = ${f4(t)}` },
            { label: "Degrees of freedom", formula: `df = n − 1 = ${df}` },
            { label: "Critical value", formula: `t_crit = ${alt === "two" ? "±" : alt === "less" ? "−" : ""}${f4(c)}` },
            { label: "p-value", formula: `p = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("t", { df }, t, meanRegions(alt, c)),
    };
}

// ---------------------------------------------------------------------------
// Two-sample t-test (Welch: unequal variances allowed)
// ---------------------------------------------------------------------------
function twoSampleT({ a, b, labelA, labelB, field, alpha, alt }) {
    const A = summarize(a, labelA);
    const B = summarize(b, labelB);
    if (A.n < 2 || B.n < 2) throw new Error("Each group needs at least 2 records.");

    const va = A._v / A.n;
    const vb = B._v / B.n;
    const se = Math.sqrt(va + vb);
    if (se === 0) throw new Error("Both groups have zero variance, so the t statistic is undefined.");

    const t = (A._m - B._m) / se;
    const df = (va + vb) ** 2 / (va ** 2 / (A.n - 1) + vb ** 2 / (B.n - 1));
    const two = tTwoSidedP(t, df);
    const p = alt === "two" ? two : (alt === "greater") === t >= 0 ? two / 2 : 1 - two / 2;
    const c = alt === "two" ? tCritical(df, alpha) : D.tCriticalOneTail(alpha, df);
    const h0 = `μ(${labelA}) = μ(${labelB})`;
    const h1 = `μ(${labelA}) ${ALT_TEXT[alt]} μ(${labelB})`;

    return {
        test: "t2",
        title: "Two-sample t-test (Welch)",
        question: `Do "${labelA}" and "${labelB}" differ in mean ${field}?`,
        alpha, alternative: alt,
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "t", value: round(t) },
        df: round(df, 2), pValue: round(p, 6),
        critical: alt === "two" ? [-round(c), round(c)] : [alt === "greater" ? round(c) : -round(c)],
        ...decide(p, alpha, h0, h1),
        groups: [publicGroup(A), publicGroup(B)],
        assumptions: [
            "The two groups are independent samples.",
            "Welch's version is used, so the group variances do not have to be equal.",
        ],
        steps: [
            { label: "Group means", formula: `x̄₁ = ${f4(A._m)} (n₁ = ${A.n}),  x̄₂ = ${f4(B._m)} (n₂ = ${B.n})` },
            { label: "Standard error", formula: `SE = √(s₁²/n₁ + s₂²/n₂) = √(${f4(va)} + ${f4(vb)}) = ${f4(se)}` },
            { label: "Test statistic", formula: `t = (x̄₁ − x̄₂) / SE = ${f4(A._m - B._m)} / ${f4(se)} = ${f4(t)}` },
            { label: "Welch–Satterthwaite df", formula: `df = (v₁+v₂)² / (v₁²/(n₁−1) + v₂²/(n₂−1)) = ${f4(df, 2)}` },
            { label: "Critical value", formula: `t_crit = ${alt === "two" ? "±" : alt === "less" ? "−" : ""}${f4(c)}` },
            { label: "p-value", formula: `p = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("t", { df }, t, meanRegions(alt, c)),
    };
}

// ---------------------------------------------------------------------------
// F-test for equality of two variances
// ---------------------------------------------------------------------------
function fTest({ a, b, labelA, labelB, field, alpha }) {
    const A = summarize(a, labelA);
    const B = summarize(b, labelB);
    if (A.n < 2 || B.n < 2) throw new Error("Each group needs at least 2 records.");
    if (B._v === 0) throw new Error(`"${labelB}" has zero variance, so the variance ratio is undefined.`);

    const F = A._v / B._v;
    const d1 = A.n - 1;
    const d2 = B.n - 1;
    const upper = fUpperP(F, d1, d2);
    const p = Math.min(1, 2 * Math.min(upper, 1 - upper));
    const hi = D.fCritical(alpha / 2, d1, d2);
    const lo = 1 / D.fCritical(alpha / 2, d2, d1);
    const h0 = `σ²(${labelA}) = σ²(${labelB})`;
    const h1 = `σ²(${labelA}) ≠ σ²(${labelB})`;

    return {
        test: "f",
        title: "F-test for two variances",
        question: `Is the spread of ${field} the same for "${labelA}" and "${labelB}"?`,
        alpha, alternative: "two",
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "F", value: round(F) },
        df: [d1, d2], pValue: round(p, 6),
        critical: [round(lo), round(hi)],
        ...decide(p, alpha, h0, h1),
        groups: [publicGroup(A), publicGroup(B)],
        assumptions: ["Both groups are independent and approximately normally distributed (the F-test is sensitive to non-normality)."],
        steps: [
            { label: "Sample variances", formula: `s₁² = ${f4(A._v)} (n₁ = ${A.n}),  s₂² = ${f4(B._v)} (n₂ = ${B.n})` },
            { label: "Test statistic", formula: `F = s₁² / s₂² = ${f4(A._v)} / ${f4(B._v)} = ${f4(F)}` },
            { label: "Degrees of freedom", formula: `df₁ = n₁ − 1 = ${d1},  df₂ = n₂ − 1 = ${d2}` },
            { label: "Critical values (two-tailed)", formula: `F_lower = ${f4(lo)},  F_upper = ${f4(hi)}` },
            { label: "p-value", formula: `p = 2·min(P(F ≥ f), P(F ≤ f)) = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("f", { df1: d1, df2: d2 }, F, [[0, lo], [hi, Infinity]]),
    };
}

// ---------------------------------------------------------------------------
// One-way ANOVA (F-test across several group means)
// ---------------------------------------------------------------------------
function anova({ groups, field, alpha }) {
    const stats = groups.map((g) => summarize(g.values, g.label)).filter((s) => s.n >= 2);
    const k = stats.length;
    const N = stats.reduce((s, g) => s + g.n, 0);
    if (k < 2) throw new Error("At least two groups with 2+ records are required.");

    const grand = stats.reduce((s, g) => s + g._m * g.n, 0) / N;
    const ssb = stats.reduce((s, g) => s + g.n * (g._m - grand) ** 2, 0);
    const ssw = stats.reduce((s, g) => s + (g.n - 1) * g._v, 0);
    const dfb = k - 1;
    const dfw = N - k;
    if (ssw === 0) throw new Error("Within-group variance is zero, so F is undefined.");

    const msb = ssb / dfb;
    const msw = ssw / dfw;
    const F = msb / msw;
    const p = fUpperP(F, dfb, dfw);
    const c = D.fCritical(alpha, dfb, dfw);
    const h0 = "all group means are equal";
    const h1 = "at least one group mean differs";

    return {
        test: "anova",
        title: "One-way ANOVA (F-test)",
        question: `Does mean ${field} differ between the ${k} groups?`,
        alpha, alternative: "greater",
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "F", value: round(F) },
        df: [dfb, dfw], pValue: round(p, 6),
        critical: [round(c)],
        ...decide(p, alpha, h0, h1),
        groups: stats.map(publicGroup),
        anovaTable: [
            { source: "Between groups", ss: round(ssb, 2), df: dfb, ms: round(msb, 2), f: round(F) },
            { source: "Within groups", ss: round(ssw, 2), df: dfw, ms: round(msw, 2), f: null },
            { source: "Total", ss: round(ssb + ssw, 2), df: N - 1, ms: null, f: null },
        ],
        effectSize: { name: "η² (share of variance explained by group)", value: round(ssb / (ssb + ssw)) },
        assumptions: ["Groups are independent, roughly normal, and have similar variances."],
        steps: [
            { label: "Grand mean", formula: `x̄ = ${f4(grand)}  (N = ${N}, k = ${k} groups)` },
            { label: "Between-group sum of squares", formula: `SSB = Σ nᵢ(x̄ᵢ − x̄)² = ${f4(ssb, 2)},  MSB = SSB/(k−1) = ${f4(msb, 2)}` },
            { label: "Within-group sum of squares", formula: `SSW = Σ (nᵢ−1)sᵢ² = ${f4(ssw, 2)},  MSW = SSW/(N−k) = ${f4(msw, 2)}` },
            { label: "Test statistic", formula: `F = MSB / MSW = ${f4(msb, 2)} / ${f4(msw, 2)} = ${f4(F)}  (df ${dfb}, ${dfw})` },
            { label: "Critical value / p-value", formula: `F_crit = ${f4(c)},  p = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("f", { df1: dfb, df2: dfw }, F, [[c, Infinity]]),
    };
}

// ---------------------------------------------------------------------------
// Chi-square test of independence
// ---------------------------------------------------------------------------
function chiSquareIndependence({ labelsA, labelsB, nameA, nameB, alpha }) {
    const rows = [...new Set(labelsA)].sort();
    const cols = [...new Set(labelsB)].sort();
    if (rows.length < 2 || cols.length < 2) throw new Error("Each variable needs at least 2 distinct values.");

    const N = labelsA.length;
    const observed = rows.map((r) => cols.map((c) => labelsA.reduce((n, v, i) => n + (v === r && labelsB[i] === c ? 1 : 0), 0)));
    const rowTot = observed.map((r) => r.reduce((a, b) => a + b, 0));
    const colTot = cols.map((_, j) => observed.reduce((a, r) => a + r[j], 0));
    const expected = rows.map((_, i) => cols.map((__, j) => (rowTot[i] * colTot[j]) / N));

    let chi = 0;
    observed.forEach((r, i) => r.forEach((o, j) => { chi += (o - expected[i][j]) ** 2 / expected[i][j]; }));

    const df = (rows.length - 1) * (cols.length - 1);
    const p = D.chiSquareUpperP(chi, df);
    const c = D.chiSquareCritical(alpha, df);
    const cells = expected.flat();
    const small = cells.filter((e) => e < 5).length;
    const warnings = [];
    if (small / cells.length > 0.2) {
        warnings.push(`${small} of ${cells.length} cells (${Math.round((small / cells.length) * 100)}%) have an expected count below 5, so the chi-square approximation may be unreliable. Try variables with fewer categories.`);
    }
    if (Math.min(...cells) < 1) warnings.push("At least one cell has an expected count below 1.");

    const h0 = `${nameA} and ${nameB} are independent`;
    const h1 = `${nameA} and ${nameB} are associated`;

    return {
        test: "chi-ind",
        title: "Chi-square test of independence",
        question: `Is ${nameA} related to ${nameB}?`,
        alpha, alternative: "greater",
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "χ²", value: round(chi) },
        df, pValue: round(p, 6), critical: [round(c)],
        ...decide(p, alpha, h0, h1),
        contingency: { rowName: nameA, colName: nameB, rows, cols, observed, expected: expected.map((r) => r.map((v) => round(v, 2))), rowTotals: rowTot, colTotals: colTot, total: N },
        effectSize: { name: "Cramér's V (0 = no association, 1 = perfect)", value: round(Math.sqrt(chi / (N * Math.min(rows.length - 1, cols.length - 1)))) },
        warnings,
        assumptions: ["Each record falls in exactly one cell, and expected counts should be at least 5 in most cells."],
        steps: [
            { label: "Expected counts", formula: `E = (row total × column total) / N  for each of the ${rows.length} × ${cols.length} cells` },
            { label: "Test statistic", formula: `χ² = Σ (O − E)² / E = ${f4(chi)}` },
            { label: "Degrees of freedom", formula: `df = (r − 1)(c − 1) = (${rows.length} − 1)(${cols.length} − 1) = ${df}` },
            { label: "Critical value / p-value", formula: `χ²_crit = ${f4(c)},  p = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("chi", { df }, chi, [[c, Infinity]]),
    };
}

// ---------------------------------------------------------------------------
// Chi-square goodness-of-fit (are the categories equally likely?)
// ---------------------------------------------------------------------------
function chiSquareGoodnessOfFit({ labels, name, alpha }) {
    const cats = [...new Set(labels)].sort();
    if (cats.length < 2) throw new Error("The variable needs at least 2 distinct values.");

    const N = labels.length;
    const observed = cats.map((c) => labels.filter((l) => l === c).length);
    const exp = N / cats.length;
    const chi = observed.reduce((s, o) => s + (o - exp) ** 2 / exp, 0);
    const df = cats.length - 1;
    const p = D.chiSquareUpperP(chi, df);
    const c = D.chiSquareCritical(alpha, df);
    const warnings = exp < 5 ? [`The expected count per category (${f4(exp, 2)}) is below 5, so the result may be unreliable.`] : [];
    const h0 = `${name} categories are equally likely`;
    const h1 = `${name} categories are not equally likely`;

    return {
        test: "chi-gof",
        title: "Chi-square goodness-of-fit",
        question: `Are records spread evenly across ${name} values?`,
        alpha, alternative: "greater",
        hypotheses: { h0: `H₀: ${h0}`, h1: `H₁: ${h1}` },
        statistic: { name: "χ²", value: round(chi) },
        df, pValue: round(p, 6), critical: [round(c)],
        ...decide(p, alpha, h0, h1),
        goodnessOfFit: cats.map((cat, i) => ({ category: cat, observed: observed[i], expected: round(exp, 2), contribution: round((observed[i] - exp) ** 2 / exp) })),
        warnings,
        assumptions: ["Records are independent; each falls in exactly one category."],
        steps: [
            { label: "Expected count (equal split)", formula: `E = N / k = ${N} / ${cats.length} = ${f4(exp, 2)}` },
            { label: "Test statistic", formula: `χ² = Σ (O − E)² / E = ${f4(chi)}` },
            { label: "Degrees of freedom", formula: `df = k − 1 = ${df}` },
            { label: "Critical value / p-value", formula: `χ²_crit = ${f4(c)},  p = ${p < 0.0001 ? "< 0.0001" : f4(p)}` },
        ],
        curve: buildCurve("chi", { df }, chi, [[c, Infinity]]),
    };
}

module.exports = {
    zTest,
    oneSampleT,
    twoSampleT,
    fTest,
    anova,
    chiSquareIndependence,
    chiSquareGoodnessOfFit,
};

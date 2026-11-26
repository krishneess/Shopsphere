const express = require("express");
const { NUMERIC_FIELDS, NUMERIC_KEYS, loadSales } = require("../models/salesData");
const { ATTRIBUTES, buildDataset } = require("../models/salesFeatures");
const T = require("../models/hypothesisTests");
const { mean, round } = require("../models/mathUtils");

const router = express.Router();

const GROUP_VARIABLES = [...ATTRIBUTES.map((a) => a.key), "Returned", "Profit Level"];

const TESTS = [
    { key: "z", label: "Z-test", group: "Mean", description: "One sample, known σ" },
    { key: "t1", label: "One-sample t-test", group: "Mean", description: "One sample, unknown σ" },
    { key: "t2", label: "Two-sample t-test", group: "Mean", description: "Compare two groups (Welch)" },
    { key: "f", label: "F-test", group: "Variance", description: "Compare two variances" },
    { key: "anova", label: "ANOVA", group: "Variance", description: "Compare 3+ group means" },
    { key: "chi-ind", label: "Chi-square independence", group: "Categorical", description: "Are two variables related?" },
    { key: "chi-gof", label: "Chi-square goodness-of-fit", group: "Categorical", description: "Are categories equally likely?" },
];

// Rows with numeric fields + categorical labels (aligned by index)
async function loadTable() {
    const rows = await require("../models/salesData").loadSales();
    const base = buildDataset(rows, "returned");
    const profit = buildDataset(rows, "profitLevel");

    return base.usable.map((row, i) => ({
        numeric: Object.fromEntries(NUMERIC_KEYS.map((k) => [k, Number(row[k])])),
        labels: {
            ...Object.fromEntries(ATTRIBUTES.map((a) => [a.key, base.dataset[i][a.key]])),
            Returned: base.dataset[i].target,
            "Profit Level": profit.dataset[i].target,
        },
    }));
}

const labelOf = (key) => NUMERIC_FIELDS.find((f) => f.key === key)?.label || key;

function parseAlpha(value) {
    const alpha = value === undefined ? 0.05 : Number(value);
    if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 0.5) {
        throw new Error("Significance level (α) must be between 0 and 0.5.");
    }
    return alpha;
}

function parseAlt(value) {
    const alt = value || "two";
    if (!["two", "greater", "less"].includes(alt)) throw new Error("Unknown alternative hypothesis.");
    return alt;
}

function needField(q) {
    if (!NUMERIC_KEYS.includes(q.field)) throw new Error("Choose a numeric column to test.");
    return q.field;
}

function needGroupVar(q) {
    if (!GROUP_VARIABLES.includes(q.groupBy)) throw new Error("Choose a grouping variable.");
    return q.groupBy;
}

// GET /api/hypothesis/options
router.get("/options", async (req, res) => {
    try {
        const table = await loadTable();
        res.json({
            tests: TESTS,
            fields: NUMERIC_FIELDS.map((f) => {
                const vals = table.map((r) => r.numeric[f.key]);
                const m = mean(vals);
                const sd = Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / vals.length);
                return { ...f, mean: round(m, 2), populationSd: round(sd, 2) };
            }),
            variables: GROUP_VARIABLES.map((v) => ({
                key: v,
                values: [...new Set(table.map((r) => r.labels[v]))].sort(),
            })),
            totalRecords: table.length,
        });
    } catch (error) {
        console.error("Hypothesis options error:", error);
        res.status(500).json({ message: "Failed to load test options." });
    }
});

// GET /api/hypothesis/run?test=t2&field=profit&groupBy=Category&a=Electronics&b=Stationery&alpha=0.05&alt=two
router.get("/run", async (req, res) => {
    try {
        const q = req.query;
        const alpha = parseAlpha(q.alpha);
        const table = await loadTable();
        if (table.length < 5) throw new Error("Not enough sales records to run a test.");

        const valuesWhere = (field, variable, value) =>
            table.filter((r) => r.labels[variable] === value).map((r) => r.numeric[field]);

        let result;

        switch (q.test) {
            case "z":
            case "t1": {
                const field = needField(q);
                const mu0 = Number(q.mu0);
                if (!Number.isFinite(mu0)) throw new Error("Enter a number for the hypothesised mean (μ₀).");
                const values = table.map((r) => r.numeric[field]);
                const alt = parseAlt(q.alt);

                if (q.test === "t1") {
                    result = T.oneSampleT({ values, label: labelOf(field), mu0, alpha, alt });
                } else {
                    const m = mean(values);
                    const popSd = Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length);
                    const custom = q.sigma !== undefined && q.sigma !== "";
                    const sigma = custom ? Number(q.sigma) : popSd;
                    result = T.zTest({
                        values, label: labelOf(field), mu0, sigma, alpha, alt,
                        sigmaSource: custom ? "value entered by you" : "population standard deviation of all records",
                    });
                }
                break;
            }
            case "t2":
            case "f": {
                const field = needField(q);
                const variable = needGroupVar(q);
                if (!q.a || !q.b || q.a === q.b) throw new Error("Choose two different groups to compare.");
                const a = valuesWhere(field, variable, q.a);
                const b = valuesWhere(field, variable, q.b);
                if (!a.length || !b.length) throw new Error("One of the selected groups has no records.");

                result =
                    q.test === "t2"
                        ? T.twoSampleT({ a, b, labelA: q.a, labelB: q.b, field: labelOf(field), alpha, alt: parseAlt(q.alt) })
                        : T.fTest({ a, b, labelA: q.a, labelB: q.b, field: labelOf(field), alpha });
                break;
            }
            case "anova": {
                const field = needField(q);
                const variable = needGroupVar(q);
                const labels = [...new Set(table.map((r) => r.labels[variable]))].sort();
                result = T.anova({
                    groups: labels.map((label) => ({ label, values: valuesWhere(field, variable, label) })),
                    field: labelOf(field),
                    alpha,
                });
                break;
            }
            case "chi-ind": {
                if (!GROUP_VARIABLES.includes(q.var1) || !GROUP_VARIABLES.includes(q.var2)) throw new Error("Choose two categorical variables.");
                if (q.var1 === q.var2) throw new Error("Choose two different variables.");
                result = T.chiSquareIndependence({
                    labelsA: table.map((r) => r.labels[q.var1]),
                    labelsB: table.map((r) => r.labels[q.var2]),
                    nameA: q.var1, nameB: q.var2, alpha,
                });
                break;
            }
            case "chi-gof": {
                if (!GROUP_VARIABLES.includes(q.var1)) throw new Error("Choose a categorical variable.");
                result = T.chiSquareGoodnessOfFit({ labels: table.map((r) => r.labels[q.var1]), name: q.var1, alpha });
                break;
            }
            default:
                throw new Error("Unknown test.");
        }

        res.json({ totalRecords: table.length, ...result });
    } catch (error) {
        console.error("Hypothesis test error:", error.message);
        res.status(400).json({ message: error.message || "Failed to run the test." });
    }
});

module.exports = router;

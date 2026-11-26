const express = require("express");
const { NUMERIC_FIELDS, NUMERIC_KEYS, loadSales, numericRows } = require("../models/salesData");
const { simpleLinearRegression, multipleLinearRegression } = require("../models/regression");

const router = express.Router();

const labelOf = (key) => NUMERIC_FIELDS.find((f) => f.key === key)?.label || key;

// Numeric columns that can be chosen as predictors / target
router.get("/fields", (req, res) => {
    res.json({ fields: NUMERIC_FIELDS });
});

// GET /api/regression/simple?x=unitCost&y=unitPrice
router.get("/simple", async (req, res) => {
    try {
        const x = String(req.query.x || "unitCost");
        const y = String(req.query.y || "unitPrice");

        if (!NUMERIC_KEYS.includes(x) || !NUMERIC_KEYS.includes(y)) {
            return res.status(400).json({ message: "Unknown predictor or target field." });
        }
        if (x === y) {
            return res.status(400).json({ message: "Predictor and target must be different fields." });
        }

        const rows = numericRows(await loadSales(), [x, y]);
        const result = simpleLinearRegression(
            rows.map((r) => Number(r[x])),
            rows.map((r) => Number(r[y]))
        );

        res.json({
            model: "Simple Linear Regression",
            predictor: { key: x, label: labelOf(x) },
            target: { key: y, label: labelOf(y) },
            ...result,
        });
    } catch (error) {
        console.error("Simple regression error:", error);
        res.status(400).json({ message: error.message || "Failed to run simple regression." });
    }
});

// GET /api/regression/multiple?y=unitPrice&x=quantity,unitCost
router.get("/multiple", async (req, res) => {
    try {
        const y = String(req.query.y || "unitPrice");
        const xs = String(req.query.x || "quantity,unitCost")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        const predictors = [...new Set(xs)];

        if (!NUMERIC_KEYS.includes(y) || predictors.some((p) => !NUMERIC_KEYS.includes(p))) {
            return res.status(400).json({ message: "Unknown predictor or target field." });
        }
        if (predictors.includes(y)) {
            return res.status(400).json({ message: "The target cannot also be a predictor." });
        }
        if (predictors.length < 2) {
            return res.status(400).json({ message: "Select at least two predictors." });
        }

        const rows = numericRows(await loadSales(), [y, ...predictors]);
        const result = multipleLinearRegression(
            rows.map((r) => predictors.map((p) => Number(r[p]))),
            rows.map((r) => Number(r[y])),
            predictors.map(labelOf)
        );

        res.json({
            model: "Multiple Linear Regression",
            target: { key: y, label: labelOf(y) },
            predictors: predictors.map((key) => ({ key, label: labelOf(key) })),
            ...result,
        });
    } catch (error) {
        console.error("Multiple regression error:", error);
        res.status(400).json({ message: error.message || "Failed to run multiple regression." });
    }
});

module.exports = router;

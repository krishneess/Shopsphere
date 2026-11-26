const express = require("express");
const { loadSales } = require("../models/salesData");
const { apriori } = require("../models/associationRules");
const { evaluateAttributes } = require("../models/decisionMetrics");
const { ATTRIBUTES, TARGETS, buildDataset } = require("../models/salesFeatures");

const router = express.Router();

function parseFraction(value, fallback, name) {
    if (value === undefined || value === "") return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 1) {
        throw new Error(`${name} must be a number between 0 and 1.`);
    }
    return n;
}

// GET /api/mining/association?level=product&minSupport=0.03&minConfidence=0.3
router.get("/association", async (req, res) => {
    try {
        const level = req.query.level === "category" ? "category" : "product";
        const minSupport = parseFraction(req.query.minSupport, 0.03, "Minimum support");
        const minConfidence = parseFraction(req.query.minConfidence, 0.3, "Minimum confidence");
        const field = level === "category" ? "category" : "productName";

        const rows = await loadSales();
        const baskets = new Map();
        rows.forEach((row) => {
            if (!row.orderId || !row[field]) return;
            if (!baskets.has(row.orderId)) baskets.set(row.orderId, new Set());
            baskets.get(row.orderId).add(row[field]);
        });

        const transactions = [...baskets.values()].map((s) => [...s]);
        if (transactions.length < 2) {
            return res.status(400).json({ message: "Not enough orders to mine association rules." });
        }

        const sizes = transactions.map((t) => t.length);
        const result = apriori(transactions, { minSupport, minConfidence });

        res.json({
            level,
            minSupport,
            minConfidence,
            uniqueItems: new Set(transactions.flat()).size,
            averageBasketSize: Number((sizes.reduce((a, b) => a + b, 0) / sizes.length).toFixed(2)),
            multiItemTransactions: sizes.filter((s) => s > 1).length,
            ...result,
        });
    } catch (error) {
        console.error("Association rule error:", error);
        res.status(400).json({ message: error.message || "Failed to mine association rules." });
    }
});

// GET /api/mining/decision-metrics?target=returned
router.get("/decision-metrics", async (req, res) => {
    try {
        const target = TARGETS.find((t) => t.key === req.query.target) || TARGETS[0];

        const { dataset, medianProfit, medianRevenue } = buildDataset(await loadSales(), target.key);
        if (dataset.length < 10) {
            return res.status(400).json({ message: "Not enough sales records to evaluate attributes." });
        }

        const evaluation = evaluateAttributes(
            dataset,
            ATTRIBUTES.map((a) => a.key),
            "target"
        );

        res.json({
            target,
            targets: TARGETS,
            medianProfit,
            medianRevenue,
            ...evaluation,
        });
    } catch (error) {
        console.error("Decision metrics error:", error);
        res.status(400).json({ message: error.message || "Failed to evaluate attributes." });
    }
});

module.exports = router;

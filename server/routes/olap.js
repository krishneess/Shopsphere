const express = require("express");
const { getDB } = require("../config");

const router = express.Router();

const DIMENSIONS = {
    date: {
        day: {
            $dateToString: {
                format: "%Y-%m-%d",
                date: "$orderDate",
            },
        },
        month: {
            $dateToString: {
                format: "%Y-%m",
                date: "$orderDate",
            },
        },
        year: {
            $dateToString: {
                format: "%Y",
                date: "$orderDate",
            },
        },
    },
    category: "$category",
    product: "$productName",
    returned: "$returned",
};

const METRICS = {
    revenue: { $sum: "$revenue" },
    cost: { $sum: "$cost" },
    profit: { $sum: "$profit" },
    units: { $sum: "$quantity" },
    lineItems: { $sum: 1 },
};

function parseDimension(value) {
    const [dimension, level] = String(value || "").split(":");

    if (!DIMENSIONS[dimension]) {
        return null;
    }

    if (dimension === "date") {
        return DIMENSIONS.date[level || "day"] || null;
    }

    return DIMENSIONS[dimension];
}

function parseList(value) {
    return String(value || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
}

router.get("/cube", async (req, res) => {
    try {
        const db = getDB();

        const dimensions = parseList(
            req.query.dimensions || "date:day,category"
        );

        const metrics = parseList(
            req.query.metrics || "revenue,profit,units"
        );

        if (dimensions.length === 0) {
            return res.status(400).json({
                message: "At least one dimension is required.",
            });
        }

        if (metrics.length === 0) {
            return res.status(400).json({
                message: "At least one metric is required.",
            });
        }

        const groupFields = {};
        const projectFields = {
            _id: 0,
        };

        for (const dimension of dimensions) {
            const parsed = parseDimension(dimension);

            if (!parsed) {
                return res.status(400).json({
                    message: `Invalid dimension: ${dimension}`,
                });
            }

            const key = dimension.replace(":", "_");

            groupFields[key] = parsed;
            projectFields[key] = `$_id.${key}`;
        }

        const groupMetrics = {};

        for (const metric of metrics) {
            if (!METRICS[metric]) {
                return res.status(400).json({
                    message: `Invalid metric: ${metric}`,
                });
            }

            groupMetrics[metric] = METRICS[metric];
            projectFields[metric] = 1;
        }

        const match = {};

        // Category filter
        if (req.query.category) {
            match.category = {
                $in: parseList(req.query.category),
            };
        }

        // Product filter
        if (req.query.product) {
            match.productName = {
                $in: parseList(req.query.product),
            };
        }

        // Returned status filter
        if (req.query.returned !== undefined) {
            if (!["true", "false"].includes(req.query.returned)) {
                return res.status(400).json({
                    message: "returned must be true or false",
                });
            }

            match.returned = req.query.returned === "true";
        }

        // Date range filter
        if (req.query.from || req.query.to) {
            match.orderDate = {};

            if (req.query.from) {
                const fromDate = new Date(req.query.from);

                if (Number.isNaN(fromDate.getTime())) {
                    return res.status(400).json({
                        message: "Invalid from date.",
                    });
                }

                match.orderDate.$gte = fromDate;
            }

            if (req.query.to) {
                const toDate = new Date(req.query.to);

                if (Number.isNaN(toDate.getTime())) {
                    return res.status(400).json({
                        message: "Invalid to date.",
                    });
                }

                match.orderDate.$lte = toDate;
            }
        }

        const sortFields = Object.fromEntries(
            Object.keys(groupFields).map((key) => [key, 1])
        );

        const pipeline = [
            {
                $match: match,
            },
            {
                $group: {
                    _id: groupFields,
                    ...groupMetrics,
                },
            },
            {
                $project: projectFields,
            },
            {
                $sort: sortFields,
            },
        ];

        const results = await db
            .collection("sales")
            .aggregate(pipeline)
            .toArray();

        res.json({
            dimensions,
            metrics,
            count: results.length,
            results,
        });
    } catch (error) {
        console.error("OLAP cube error:", error);

        res.status(500).json({
            message: "Failed to calculate OLAP cube.",
        });
    }
});

module.exports = router;
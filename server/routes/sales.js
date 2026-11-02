
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const XLSX = require("xlsx");
const { getDB } = require("../config");

const router = express.Router();

const RAW_DIR = path.join(__dirname, "..", "uploads", "raw");

fs.mkdirSync(RAW_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, RAW_DIR),
    filename: (req, file, cb) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const extension = path.extname(file.originalname).toLowerCase();
        cb(null, `sales-${timestamp}${extension}`);
    }
});

function fileFilter(req, file, cb) {
    const extension = path.extname(file.originalname).toLowerCase();

    if ([".csv", ".xlsx", ".xls"].includes(extension)) {
        return cb(null, true);
    }

    cb(new Error("Only CSV and Excel files are allowed."));
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 }
});

function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const rows = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on("data", (row) => rows.push(row))
            .on("end", () => resolve(rows))
            .on("error", reject);
    });
}

function parseExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];

    return XLSX.utils.sheet_to_json(sheet, {
        defval: ""
    });
}

function cleanSalesRows(rows) {
    const accepted = [];
    const rejected = [];

    const required = [
        "orderId",
        "orderDate",
        "productId",
        "productName",
        "category",
        "quantity",
        "unitPrice",
        "unitCost",
        "returned"
    ];

    rows.forEach((row, index) => {
        const cleaned = {
            orderId: String(row.orderId || "").trim(),
            orderDate: new Date(row.orderDate),
            productId: String(row.productId || "").trim(),
            productName: String(row.productName || "").trim(),
            category: String(row.category || "").trim(),
            quantity: Number(row.quantity),
            unitPrice: Number(row.unitPrice),
            unitCost: Number(row.unitCost),
            returned: String(row.returned).toLowerCase() === "true"
        };

        const missingFields = required.filter((field) => {
            return row[field] === undefined || String(row[field]).trim() === "";
        });

        const invalid =
            missingFields.length > 0 ||
            Number.isNaN(cleaned.orderDate.getTime()) ||
            !Number.isInteger(cleaned.quantity) ||
            cleaned.quantity <= 0 ||
            !Number.isFinite(cleaned.unitPrice) ||
            cleaned.unitPrice < 0 ||
            !Number.isFinite(cleaned.unitCost) ||
            cleaned.unitCost < 0 ||
            !["true", "false"].includes(String(row.returned).toLowerCase());

        if (invalid) {
            rejected.push({
                rowNumber: index + 2,
                reason: missingFields.length
                    ? `Missing fields: ${missingFields.join(", ")}`
                    : "Invalid date, quantity, price, cost, or return value"
            });
            return;
        }

        cleaned.revenue = cleaned.quantity * cleaned.unitPrice;
        cleaned.cost = cleaned.quantity * cleaned.unitCost;
        cleaned.profit = cleaned.revenue - cleaned.cost;

        accepted.push(cleaned);
    });

    return { accepted, rejected };
}

router.get("/", (req, res) => {
    res.json({ message: "ShopSphere Sales API is running" });
});

router.post("/upload", upload.single("salesFile"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "Please upload a CSV or Excel file."
            });
        }

        const extension = path.extname(req.file.originalname).toLowerCase();

        const rows = extension === ".csv"
            ? await parseCSV(req.file.path)
            : parseExcel(req.file.path);

        if (!rows.length) {
            return res.status(400).json({
                message: "The uploaded file contains no data rows."
            });
        }

        const { accepted, rejected } = cleanSalesRows(rows);

        if (!accepted.length) {
            return res.status(400).json({
                message: "No valid rows were found.",
                rejectedCount: rejected.length,
                rejected
            });
        }

        const db = getDB();

        // Replace the active dataset only after valid rows are available.
        await db.collection("sales").deleteMany({});
        await db.collection("sales").insertMany(
            accepted.map((row) => ({
                ...row,
                importedAt: new Date()
            }))
        );

        res.status(201).json({
            message: "Sales dataset imported successfully.",
            filename: req.file.filename,
            extractedCount: rows.length,
            acceptedCount: accepted.length,
            rejectedCount: rejected.length,
            rejected
        });
    } catch (error) {
        console.error("Sales ETL upload error:", error);
        res.status(500).json({
            message: "Failed to process the sales dataset."
        });
    }
});


// Sales analytics summary
router.get("/analytics/summary", async (req, res) => {
    try {
        const db = getDB();

        const result = await db.collection("sales").aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$revenue" },
                    totalCost: { $sum: "$cost" },
                    totalProfit: { $sum: "$profit" },
                    totalUnits: { $sum: "$quantity" },
                    totalLineItems: { $sum: 1 },
                    returnedItems: {
                        $sum: {
                            $cond: ["$returned", "$quantity", 0]
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalRevenue: 1,
                    totalCost: 1,
                    totalProfit: 1,
                    totalUnits: 1,
                    totalLineItems: 1,
                    returnedItems: 1,
                    profitMargin: {
                        $cond: [
                            { $gt: ["$totalRevenue", 0] },
                            {
                                $multiply: [
                                    { $divide: ["$totalProfit", "$totalRevenue"] },
                                    100
                                ]
                            },
                            0
                        ]
                    }
                }
            }
        ]).toArray();

        res.json(result[0] || {
            totalRevenue: 0,
            totalCost: 0,
            totalProfit: 0,
            totalUnits: 0,
            totalLineItems: 0,
            returnedItems: 0,
            profitMargin: 0
        });
    } catch (error) {
        console.error("Sales analytics summary error:", error);
        res.status(500).json({
            message: "Failed to calculate sales analytics."
        });
    }
});

// Sales trend grouped by date
router.get("/analytics/trends", async (req, res) => {
    try {
        const db = getDB();

        const trends = await db.collection("sales").aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: "$orderDate"
                        }
                    },
                    revenue: { $sum: "$revenue" },
                    cost: { $sum: "$cost" },
                    profit: { $sum: "$profit" },
                    unitsSold: { $sum: "$quantity" }
                }
            },
            {
                $sort: { _id: 1 }
            },
            {
                $project: {
                    _id: 0,
                    date: "$_id",
                    revenue: 1,
                    cost: 1,
                    profit: 1,
                    unitsSold: 1
                }
            }
        ]).toArray();

        res.json(trends);
    } catch (error) {
        console.error("Sales trends error:", error);
        res.status(500).json({
            message: "Failed to calculate sales trends."
        });
    }
});

// Product performance: top and bottom selling products
router.get("/analytics/products", async (req, res) => {
    try {
        const db = getDB();

        const products = await db.collection("sales").aggregate([
            {
                $group: {
                    _id: "$productId",
                    productName: { $first: "$productName" },
                    category: { $first: "$category" },
                    unitsSold: { $sum: "$quantity" },
                    revenue: { $sum: "$revenue" },
                    profit: { $sum: "$profit" }
                }
            },
            {
                $sort: { unitsSold: -1 }
            }
        ]).toArray();

        res.json({
            topProducts: products.slice(0, 5),
            bottomProducts: [...products].sort(
                (a, b) => a.unitsSold - b.unitsSold
            ).slice(0, 5)
        });
    } catch (error) {
        console.error("Product analytics error:", error);
        res.status(500).json({
            message: "Failed to calculate product analytics."
        });
    }
});

// Frequently bought together: products appearing in the same order
router.get("/analytics/bundles", async (req, res) => {
    try {
        const db = getDB();

        const rows = await db.collection("sales")
            .find(
                {},
                {
                    projection: {
                        orderId: 1,
                        productId: 1,
                        productName: 1
                    }
                }
            )
            .toArray();

        // Group products by order
        const orders = new Map();
        const productNames = new Map();

        rows.forEach((row) => {
            if (!orders.has(row.orderId)) {
                orders.set(row.orderId, new Set());
            }

            orders.get(row.orderId).add(row.productId);
            productNames.set(row.productId, row.productName);
        });

        // Count how often each product pair appears together
        const pairCounts = new Map();

        orders.forEach((productSet) => {
            const products = [...productSet].sort();

            for (let i = 0; i < products.length; i++) {
                for (let j = i + 1; j < products.length; j++) {
                    const productA = products[i];
                    const productB = products[j];
                    const pairKey = `${productA}__${productB}`;

                    if (!pairCounts.has(pairKey)) {
                        pairCounts.set(pairKey, {
                            productA,
                            productB,
                            coOrderCount: 0
                        });
                    }

                    pairCounts.get(pairKey).coOrderCount++;
                }
            }
        });

        const bundles = [...pairCounts.values()]
            .map((pair) => ({
                productA: {
                    id: pair.productA,
                    name: productNames.get(pair.productA)
                },
                productB: {
                    id: pair.productB,
                    name: productNames.get(pair.productB)
                },
                coOrderCount: pair.coOrderCount
            }))
            .sort((a, b) => b.coOrderCount - a.coOrderCount)
            .slice(0, 10);

        res.json({
            message: "Frequently bought together analysis completed.",
            totalOrdersAnalyzed: orders.size,
            bundles
        });
    } catch (error) {
        console.error("Bundle analytics error:", error);

        res.status(500).json({
            message: "Failed to calculate frequently bought together."
        });
    }
});
module.exports = router;

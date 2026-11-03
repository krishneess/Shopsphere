
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

// Descriptive statistics for a selected sales metric
router.get("/statistics/descriptive", async (req, res) => {
    try {
        const allowedMetrics = [
            "revenue",
            "profit",
            "cost",
            "quantity",
            "unitPrice",
            "unitCost",
        ];

        const metric = req.query.metric || "revenue";

        if (!allowedMetrics.includes(metric)) {
            return res.status(400).json({
                message: "Invalid metric selected.",
                allowedMetrics,
            });
        }

        const db = getDB();

        const values = await db.collection("sales")
            .find(
                { [metric]: { $type: "number" } },
                { projection: { [metric]: 1, _id: 0 } }
            )
            .toArray();

        const numbers = values
            .map((row) => row[metric])
            .filter(Number.isFinite)
            .sort((a, b) => a - b);

        if (numbers.length === 0) {
            return res.json({
                metric,
                count: 0,
                message: "No numeric data available for this metric.",
                statistics: null,
            });
        }

        const count = numbers.length;
        const sum = numbers.reduce((total, value) => total + value, 0);
        const mean = sum / count;

        const medianOf = (array) => {
            const length = array.length;
            const middle = Math.floor(length / 2);

            if (length === 0) return null;

            return length % 2 === 0
                ? (array[middle - 1] + array[middle]) / 2
                : array[middle];
        };

        const median = medianOf(numbers);

        const lowerHalf = numbers.slice(0, Math.floor(count / 2));
        const upperHalf = numbers.slice(Math.ceil(count / 2));

        const q1 = medianOf(lowerHalf);
        const q3 = medianOf(upperHalf);

        const squaredDifferences = numbers.reduce(
            (total, value) => total + Math.pow(value - mean, 2),
            0
        );

        const variance = count > 1
            ? squaredDifferences / (count - 1)
            : 0;

        const standardDeviation = Math.sqrt(variance);

        const frequency = new Map();

        numbers.forEach((value) => {
            frequency.set(value, (frequency.get(value) || 0) + 1);
        });

        const highestFrequency = Math.max(...frequency.values());

        const modes = [...frequency.entries()]
            .filter(([, frequencyCount]) => frequencyCount === highestFrequency)
            .map(([value]) => value);

        const isAllUnique = highestFrequency === 1;

        res.json({
            metric,
            count,
            statistics: {
                mean,
                median,
                mode: isAllUnique ? null : modes,
                minimum: numbers[0],
                maximum: numbers[count - 1],
                range: numbers[count - 1] - numbers[0],
                q1,
                q3,
                interquartileRange: q3 - q1,
                variance,
                standardDeviation,
            },
        });
    } catch (error) {
        console.error("Descriptive statistics error:", error);

        res.status(500).json({
            message: "Failed to calculate descriptive statistics.",
        });
    }
});

// Regression Analysis: predict unitPrice using quantity and unitCost
router.get("/regression", async (req, res) => {
  try {
    const db = getDB();

    const rows = await db.collection("sales").find(
      {
        quantity: { $type: "number" },
        unitCost: { $type: "number" },
        unitPrice: { $type: "number" },
      },
      {
        projection: {
          _id: 0,
          quantity: 1,
          unitCost: 1,
          unitPrice: 1,
        },
      }
    ).toArray();

    if (rows.length < 5) {
      return res.status(400).json({
        message: "Not enough valid sales records for regression.",
      });
    }

    // Deterministic 80/20 train-test split
    const splitIndex = Math.floor(rows.length * 0.8);
    const train = rows.slice(0, splitIndex);
    const test = rows.slice(splitIndex);

    // Multiple linear regression using gradient descent
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;

    const meanPrice =
      train.reduce((sum, row) => sum + row.unitPrice, 0) / train.length;

    const meanQuantity =
      train.reduce((sum, row) => sum + row.quantity, 0) / train.length;

    const meanCost =
      train.reduce((sum, row) => sum + row.unitCost, 0) / train.length;

    const stdQuantity = Math.sqrt(
      train.reduce((sum, row) => sum + (row.quantity - meanQuantity) ** 2, 0) /
        train.length
    ) || 1;

    const stdCost = Math.sqrt(
      train.reduce((sum, row) => sum + (row.unitCost - meanCost) ** 2, 0) /
        train.length
    ) || 1;

    const normalizedTrain = train.map((row) => ({
      x1: (row.quantity - meanQuantity) / stdQuantity,
      x2: (row.unitCost - meanCost) / stdCost,
      y: row.unitPrice,
    }));

    const learningRate = 0.01;
    const iterations = 1500;
    const trainingLoss = [];

    for (let i = 0; i < iterations; i++) {
      let db0 = 0;
      let db1 = 0;
      let db2 = 0;

      for (const row of normalizedTrain) {
        const prediction = b0 + b1 * row.x1 + b2 * row.x2;
        const error = prediction - row.y;

        db0 += error;
        db1 += error * row.x1;
        db2 += error * row.x2;
      }

      b0 -= learningRate * (db0 / train.length);
      b1 -= learningRate * (db1 / train.length);
      b2 -= learningRate * (db2 / train.length);

      if (i % 100 === 0 || i === iterations - 1) {
        const mse =
          normalizedTrain.reduce((sum, row) => {
            const prediction = b0 + b1 * row.x1 + b2 * row.x2;
            return sum + (prediction - row.y) ** 2;
          }, 0) / train.length;

        trainingLoss.push({
          iteration: i + 1,
          mse: Number(mse.toFixed(2)),
        });
      }
    }

    const predictions = test.map((row) => {
      const x1 = (row.quantity - meanQuantity) / stdQuantity;
      const x2 = (row.unitCost - meanCost) / stdCost;

      const predicted = b0 + b1 * x1 + b2 * x2;

      return {
        actual: row.unitPrice,
        predicted: Number(predicted.toFixed(2)),
      };
    });

    const actualMean =
      predictions.reduce((sum, row) => sum + row.actual, 0) /
      predictions.length;

    const mae =
      predictions.reduce(
        (sum, row) => sum + Math.abs(row.actual - row.predicted),
        0
      ) / predictions.length;

    const mse =
      predictions.reduce(
        (sum, row) => sum + (row.actual - row.predicted) ** 2,
        0
      ) / predictions.length;

    const ssTotal = predictions.reduce(
      (sum, row) => sum + (row.actual - actualMean) ** 2,
      0
    );

    const ssResidual = predictions.reduce(
      (sum, row) => sum + (row.actual - row.predicted) ** 2,
      0
    );

    const r2 = ssTotal === 0 ? null : 1 - ssResidual / ssTotal;

    res.json({
      model: "Multiple Linear Regression",
      target: "unitPrice",
      predictors: ["quantity", "unitCost"],
      totalRecords: rows.length,
      trainingRecords: train.length,
      testingRecords: test.length,
      metrics: {
        mae: Number(mae.toFixed(2)),
        rmse: Number(Math.sqrt(mse).toFixed(2)),
        r2: r2 === null ? null : Number(r2.toFixed(4)),
      },
      predictions,
      trainingLoss,
    });
  } catch (error) {
    console.error("Regression error:", error);
    res.status(500).json({
      message: "Failed to run regression analysis.",
      error: error.message,
    });
  }
});
module.exports = router;

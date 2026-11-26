const { getDB } = require("../config");

// Numeric sales columns that can be used in regression models.
const NUMERIC_FIELDS = [
    { key: "quantity", label: "Quantity" },
    { key: "unitPrice", label: "Unit Price" },
    { key: "unitCost", label: "Unit Cost" },
    { key: "revenue", label: "Revenue" },
    { key: "cost", label: "Total Cost" },
    { key: "profit", label: "Profit" },
];

const NUMERIC_KEYS = NUMERIC_FIELDS.map((f) => f.key);

async function loadSales() {
    return getDB().collection("sales").find({}).toArray();
}

// Keep only rows where every requested field is a finite number.
function numericRows(rows, keys) {
    return rows.filter((row) => keys.every((k) => Number.isFinite(Number(row[k])) && row[k] !== null && row[k] !== ""));
}

module.exports = { NUMERIC_FIELDS, NUMERIC_KEYS, loadSales, numericRows };

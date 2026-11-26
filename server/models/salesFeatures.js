// Turns raw sales rows into categorical attributes and class labels for the
// decision-tree measures (Gain Ratio and Gini Index).

const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const ATTRIBUTES = [
    { key: "Category", label: "Category" },
    { key: "Product", label: "Product" },
    { key: "Quantity", label: "Quantity" },
    { key: "Price Band", label: "Price Band" },
    { key: "Cost Band", label: "Cost Band" },
    { key: "Order Month", label: "Order Month" },
    { key: "Order Weekday", label: "Order Weekday" },
];

const TARGETS = [
    {
        key: "returned",
        label: "Returned",
        description: "Was the item returned by the customer? (Returned / Kept)",
    },
    {
        key: "profitLevel",
        label: "Profit Level",
        description: "Is the line-item profit at or above the median? (High / Low profit)",
    },
    {
        key: "orderValue",
        label: "Order Value",
        description: "Is the line-item revenue at or above the median? (High / Low value)",
    },
];

function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// Equal-frequency (tercile) binning with readable labels
function makeBander(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const t1 = quantile(sorted, 1 / 3);
    const t2 = quantile(sorted, 2 / 3);
    const fmt = (v) => Math.round(v).toLocaleString("en-IN");
    return (value) => {
        if (value <= t1) return `Low (≤ ${fmt(t1)})`;
        if (value <= t2) return `Medium (${fmt(t1)}–${fmt(t2)})`;
        return `High (> ${fmt(t2)})`;
    };
}

function buildDataset(rows, targetKey) {
    const usable = rows.filter(
        (r) =>
            r.category &&
            r.productName &&
            Number.isFinite(Number(r.quantity)) &&
            Number.isFinite(Number(r.unitPrice)) &&
            Number.isFinite(Number(r.unitCost)) &&
            !Number.isNaN(new Date(r.orderDate).getTime())
    );

    const priceBand = makeBander(usable.map((r) => Number(r.unitPrice)));
    const costBand = makeBander(usable.map((r) => Number(r.unitCost)));

    const profits = usable.map((r) => Number(r.profit)).sort((a, b) => a - b);
    const revenues = usable.map((r) => Number(r.revenue)).sort((a, b) => a - b);
    const medianProfit = quantile(profits, 0.5);
    const medianRevenue = quantile(revenues, 0.5);

    const labelFor = (row) => {
        if (targetKey === "returned") return row.returned ? "Returned" : "Kept";
        if (targetKey === "profitLevel") return Number(row.profit) >= medianProfit ? "High profit" : "Low profit";
        return Number(row.revenue) >= medianRevenue ? "High value" : "Low value";
    };

    const dataset = usable.map((row) => {
        const date = new Date(row.orderDate);
        return {
            Category: row.category,
            Product: row.productName,
            Quantity: `Qty ${row.quantity}`,
            "Price Band": priceBand(Number(row.unitPrice)),
            "Cost Band": costBand(Number(row.unitCost)),
            "Order Month": MONTHS[date.getUTCMonth()],
            "Order Weekday": WEEKDAYS[date.getUTCDay()],
            target: labelFor(row),
        };
    });

    return { dataset, medianProfit, medianRevenue };
}

module.exports = { ATTRIBUTES, TARGETS, buildDataset };

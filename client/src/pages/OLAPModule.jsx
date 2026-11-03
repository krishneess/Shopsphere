import { useCallback, useEffect, useMemo, useState } from "react";
import "./OLAPModule.css";

const API_URL = "http://localhost:5000/api/olap/cube";

const DIMENSION_OPTIONS = [
    { value: "date", label: "Date" },
    { value: "category", label: "Category" },
    { value: "product", label: "Product" },
    { value: "returned", label: "Returned Status" },
];

const METRIC_OPTIONS = [
    { value: "revenue", label: "Revenue" },
    { value: "cost", label: "Cost" },
    { value: "profit", label: "Profit" },
    { value: "units", label: "Units Sold" },
    { value: "lineItems", label: "Line Items" },
];

const DATE_LEVELS = [
    { value: "day", label: "Day" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
];

const DATE_HIERARCHY = ["day", "month", "year"];

function formatMetric(value, metric) {
    const number = Number(value || 0);

    if (["revenue", "cost", "profit"].includes(metric)) {
        return number.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        });
    }

    return number.toLocaleString("en-IN");
}

function OLAPModule() {
    const [dimension, setDimension] = useState("date");
    const [dateLevel, setDateLevel] = useState("day");
    const [secondDimension, setSecondDimension] = useState("category");

    const [metrics, setMetrics] = useState([
        "revenue",
        "profit",
        "units",
    ]);

    const [category, setCategory] = useState("");
    const [product, setProduct] = useState("");
    const [returned, setReturned] = useState("");

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [hasLoaded, setHasLoaded] = useState(false);

    const dimensions = useMemo(() => {
        const primary =
            dimension === "date"
                ? `date:${dateLevel}`
                : dimension;

        return secondDimension
            ? [primary, secondDimension]
            : [primary];
    }, [dimension, dateLevel, secondDimension]);

    const loadCube = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({
                dimensions: dimensions.join(","),
                metrics: metrics.join(","),
            });

            if (category.trim()) {
                params.set("category", category.trim());
            }

            if (product.trim()) {
                params.set("product", product.trim());
            }

            if (returned !== "") {
                params.set("returned", returned);
            }

            const response = await fetch(
                `${API_URL}?${params.toString()}`
            );

            if (!response.ok) {
                const errorData = await response
                    .json()
                    .catch(() => ({}));

                throw new Error(
                    errorData.message || "Unable to load OLAP data."
                );
            }

            const data = await response.json();

            setResults(Array.isArray(data.results) ? data.results : []);
            setHasLoaded(true);
        } catch (err) {
            setError(
                err.message ||
                    "Could not connect to the OLAP API. Check that the backend is running."
            );
        } finally {
            setLoading(false);
        }
    }, [dimensions, metrics, category, product, returned]);

    useEffect(() => {
        loadCube();
    }, [loadCube]);

    const toggleMetric = (metric) => {
        setMetrics((current) => {
            if (current.includes(metric)) {
                if (current.length === 1) return current;

                return current.filter((item) => item !== metric);
            }

            return [...current, metric];
        });
    };

    const swapDimensions = () => {
        if (!secondDimension) return;

        const currentPrimary = dimension;
        const currentSecondary = secondDimension;

        setDimension(currentSecondary);
        setSecondDimension(currentPrimary);
    };

    const dateLevelIndex = DATE_HIERARCHY.indexOf(dateLevel);

    const canRollUp =
        dimension === "date"
            ? dateLevelIndex < DATE_HIERARCHY.length - 1
            : dimension === "product";

    const canDrillDown =
        dimension === "date"
            ? dateLevelIndex > 0
            : dimension === "category";

    const handleRollUp = () => {
        if (dimension === "date") {
            if (dateLevelIndex < DATE_HIERARCHY.length - 1) {
                setDateLevel(DATE_HIERARCHY[dateLevelIndex + 1]);
            }

            return;
        }

        if (dimension === "product") {
            setDimension("category");

            if (secondDimension === "category") {
                setSecondDimension("product");
            }
        }
    };

    const handleDrillDown = () => {
        if (dimension === "date") {
            if (dateLevelIndex > 0) {
                setDateLevel(DATE_HIERARCHY[dateLevelIndex - 1]);
            }

            return;
        }

        if (dimension === "category") {
            setDimension("product");

            if (secondDimension === "product") {
                setSecondDimension("category");
            }
        }
    };

    const displayDimension = (value) => {
        if (value.startsWith("date:")) {
            const level = value.split(":")[1];
            return `Date (${level})`;
        }

        return (
            DIMENSION_OPTIONS.find(
                (option) => option.value === value
            )?.label || value
        );
    };

    const totalByMetric = (metric) =>
        results.reduce(
            (sum, row) => sum + Number(row[metric] || 0),
            0
        );

    const clearFilters = () => {
        setCategory("");
        setProduct("");
        setReturned("");
    };

    return (
        <div className="olap-module">
            <div className="olap-heading">
                <div>
                    <p className="olap-eyebrow">
                        MULTIDIMENSIONAL ANALYSIS
                    </p>

                    <h3>OLAP Explorer</h3>

                    <p>
                        Analyze sales data across dimensions, apply filters,
                        and summarize business performance.
                    </p>
                </div>

                <button
                    type="button"
                    className="olap-refresh-button"
                    onClick={loadCube}
                    disabled={loading}
                >
                    {loading ? "Loading..." : "↻ Refresh Cube"}
                </button>
            </div>

            <section className="olap-control-panel">
                <div className="olap-panel-title">
                    <div>
                        <span className="olap-panel-icon">▦</span>
                        <h4>Cube Configuration</h4>
                    </div>

                    <span className="olap-live-label">LIVE DATA</span>
                </div>

                <div className="olap-control-grid">
                    <label className="olap-field">
                        <span>Primary Dimension</span>

                        <select
                            value={dimension}
                            onChange={(event) =>
                                setDimension(event.target.value)
                            }
                        >
                            {DIMENSION_OPTIONS.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {dimension === "date" && (
                        <label className="olap-field">
                            <span>Date Granularity</span>

                            <select
                                value={dateLevel}
                                onChange={(event) =>
                                    setDateLevel(event.target.value)
                                }
                            >
                                {DATE_LEVELS.map((level) => (
                                    <option
                                        key={level.value}
                                        value={level.value}
                                    >
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    <label className="olap-field">
                        <span>Secondary Dimension</span>

                        <select
                            value={secondDimension}
                            onChange={(event) =>
                                setSecondDimension(event.target.value)
                            }
                        >
                            <option value="">None</option>

                            {DIMENSION_OPTIONS.filter(
                                (option) => option.value !== dimension
                            ).map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className="olap-metrics-section">
                    <span className="olap-control-label">
                        Measures / Metrics
                    </span>

                    <div className="olap-metric-options">
                        {METRIC_OPTIONS.map((metric) => (
                            <label
                                key={metric.value}
                                className={`olap-metric-option ${
                                    metrics.includes(metric.value)
                                        ? "active"
                                        : ""
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={metrics.includes(metric.value)}
                                    onChange={() =>
                                        toggleMetric(metric.value)
                                    }
                                />

                                {metric.label}
                            </label>
                        ))}
                    </div>
                </div>
            </section>

            <section className="olap-control-panel">
                <div className="olap-panel-title">
                    <div>
                        <span className="olap-panel-icon">⌕</span>
                        <h4>Slice & Dice Filters</h4>
                    </div>

                    <button
                        type="button"
                        className="olap-clear-button"
                        onClick={clearFilters}
                    >
                        Clear filters
                    </button>
                </div>

                <div className="olap-control-grid">
                    <label className="olap-field">
                        <span>Category</span>

                        <input
                            type="text"
                            placeholder="e.g. Electronics"
                            value={category}
                            onChange={(event) =>
                                setCategory(event.target.value)
                            }
                        />
                    </label>

                    <label className="olap-field">
                        <span>Product</span>

                        <input
                            type="text"
                            placeholder="Enter product name"
                            value={product}
                            onChange={(event) =>
                                setProduct(event.target.value)
                            }
                        />
                    </label>

                    <label className="olap-field">
                        <span>Returned Status</span>

                        <select
                            value={returned}
                            onChange={(event) =>
                                setReturned(event.target.value)
                            }
                        >
                            <option value="">All records</option>
                            <option value="true">Returned</option>
                            <option value="false">Not returned</option>
                        </select>
                    </label>
                </div>
            </section>

            <section className="olap-operation-bar">
                <div className="olap-operation-content">
                    <span className="olap-operation-label">
                        Active OLAP Operations
                    </span>

                    <div className="olap-operation-tags">
                        <span>Cube</span>

                        {dimension === "date" && (
                            <span>Date Level: {dateLevel}</span>
                        )}

                        {dimension === "category" && (
                            <span>Category Level</span>
                        )}

                        {dimension === "product" && (
                            <span>Product Level</span>
                        )}

                        {category && <span>Slice: Category</span>}
                        {product && <span>Dice: Product</span>}
                        {returned !== "" && (
                            <span>Slice: Returned</span>
                        )}

                        {secondDimension && (
                            <span>2D Aggregation</span>
                        )}
                    </div>
                </div>

                <div className="olap-operation-buttons">
                    <button
                        type="button"
                        className="olap-operation-button"
                        onClick={handleRollUp}
                        disabled={!canRollUp || loading}
                        title="Aggregate data at a broader level"
                    >
                        ↑ Roll Up
                    </button>

                    <button
                        type="button"
                        className="olap-operation-button"
                        onClick={handleDrillDown}
                        disabled={!canDrillDown || loading}
                        title="View data at a more detailed level"
                    >
                        ↓ Drill Down
                    </button>

                    <button
                        type="button"
                        className="olap-pivot-button"
                        onClick={swapDimensions}
                        disabled={!secondDimension || loading}
                        title="Swap the primary and secondary dimensions"
                    >
                        ⇄ Pivot Dimensions
                    </button>
                </div>
            </section>

            {error && (
                <div className="olap-error">
                    <strong>Could not load OLAP data</strong>

                    <p>{error}</p>

                    <button type="button" onClick={loadCube}>
                        Try again
                    </button>
                </div>
            )}

            <section className="olap-results-panel">
                <div className="olap-results-heading">
                    <div>
                        <p className="olap-eyebrow">CUBE OUTPUT</p>
                        <h4>Aggregated Sales Results</h4>
                    </div>

                    <span className="olap-result-count">
                        {results.length.toLocaleString("en-IN")} GROUPS
                    </span>
                </div>

                {loading && !hasLoaded ? (
                    <div className="olap-empty-state">
                        Loading cube data...
                    </div>
                ) : results.length === 0 ? (
                    <div className="olap-empty-state">
                        {hasLoaded
                            ? "No records match the selected filters."
                            : "No cube data available."}
                    </div>
                ) : (
                    <div className="olap-table-wrapper">
                        <table className="olap-table">
                            <thead>
                                <tr>
                                    {dimensions.map((item) => (
                                        <th key={item}>
                                            {displayDimension(item)}
                                        </th>
                                    ))}

                                    {metrics.map((metric) => (
                                        <th key={metric}>
                                            {METRIC_OPTIONS.find(
                                                (option) =>
                                                    option.value === metric
                                            )?.label || metric}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            <tbody>
                                {results.map((row, index) => (
                                    <tr key={index}>
                                        {dimensions.map((item) => {
                                            const key = item.replace(
                                                ":",
                                                "_"
                                            );

                                            return (
                                                <td key={item}>
                                                    {String(
                                                        row[key] ?? "—"
                                                    )}
                                                </td>
                                            );
                                        })}

                                        {metrics.map((metric) => (
                                            <td
                                                key={metric}
                                                className="olap-number-cell"
                                            >
                                                {formatMetric(
                                                    row[metric],
                                                    metric
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>

                            <tfoot>
                                <tr>
                                    <td
                                        colSpan={dimensions.length}
                                        className="olap-total-label"
                                    >
                                        Grand Total
                                    </td>

                                    {metrics.map((metric) => (
                                        <td
                                            key={metric}
                                            className="olap-number-cell"
                                        >
                                            {formatMetric(
                                                totalByMetric(metric),
                                                metric
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </section>

            <div className="olap-footnote">
                Results are aggregated from the active sales dataset stored
                in MongoDB. Upload a new dataset through ETL to refresh the
                underlying analysis.
            </div>
        </div>
    );
}

export default OLAPModule;
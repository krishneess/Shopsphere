import { useEffect, useState } from "react";
import api from "../api";
import "./StatsModule.css";

const API_BASE = "/sales";

const metrics = [
    { value: "revenue", label: "Revenue" },
    { value: "profit", label: "Profit" },
    { value: "cost", label: "Cost" },
    { value: "quantity", label: "Quantity Sold" },
    { value: "unitPrice", label: "Unit Price" },
    { value: "unitCost", label: "Unit Cost" },
];

const statisticLabels = [
    { key: "mean", label: "Mean", description: "Average value" },
    { key: "median", label: "Median", description: "Middle value" },
    { key: "mode", label: "Mode", description: "Most frequent value" },
    { key: "minimum", label: "Minimum", description: "Smallest value" },
    { key: "maximum", label: "Maximum", description: "Largest value" },
    { key: "range", label: "Range", description: "Maximum − minimum" },
    { key: "q1", label: "First Quartile (Q1)", description: "25th percentile" },
    { key: "q3", label: "Third Quartile (Q3)", description: "75th percentile" },
    {
        key: "interquartileRange",
        label: "Interquartile Range",
        description: "Q3 − Q1",
    },
    {
        key: "variance",
        label: "Sample Variance",
        description: "Spread of values",
    },
    {
        key: "standardDeviation",
        label: "Standard Deviation",
        description: "Typical spread from the mean",
    },
];

function formatValue(value) {
    if (value === null || value === undefined) {
        return "—";
    }

    if (Array.isArray(value)) {
        return value.map((item) => formatValue(item)).join(", ");
    }

    return Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 3,
    });
}

function StatsModule() {
    const [metric, setMetric] = useState("revenue");
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function fetchStatistics() {
            setLoading(true);
            setError("");
            setData(null);

            try {
                const response = await api.get(
                    `${API_BASE}/statistics/descriptive?metric=${metric}`,
                    { signal: controller.signal }
                );
                setData(response.data);
            } catch (err) {
                if (err.name !== "AbortError" && err.name !== "CanceledError") {
                    setError(
                        err.response?.data?.message ||
                            err.message ||
                            "Unable to connect to the statistics API."
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchStatistics();

        return () => controller.abort();
    }, [metric]);

    const selectedMetric = metrics.find(
        (item) => item.value === metric
    );

    return (
        <div className="stats-module">
            <div className="stats-intro">
                <div>
                    <p className="stats-eyebrow">
                        STATISTICAL WORKSPACE
                    </p>

                    <h3>Descriptive Statistics</h3>

                    <p>
                        Summarize the distribution and variability of your
                        imported sales data.
                    </p>
                </div>

                <div className="stats-data-badge">
                    <span className="stats-live-dot" />
                    MongoDB Sales Data
                </div>
            </div>

            <div className="stats-controls">
                <label htmlFor="stats-metric">
                    Select metric
                </label>

                <select
                    id="stats-metric"
                    value={metric}
                    onChange={(event) => setMetric(event.target.value)}
                >
                    {metrics.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </select>

                <p>
                    Statistics are calculated from the active sales dataset.
                </p>
            </div>

            {loading && (
                <div className="stats-state">
                    <div className="stats-spinner" />
                    <p>Calculating statistics...</p>
                </div>
            )}

            {error && !loading && (
                <div className="stats-error">
                    <strong>Unable to load statistics</strong>
                    <p>{error}</p>
                    <p>
                        Check that your backend server is running and that
                        the sales dataset has been imported.
                    </p>
                </div>
            )}

            {data && !loading && !error && data.count === 0 && (
                <div className="stats-empty">
                    <strong>No sales data available</strong>
                    <p>
                        Import a valid sales dataset through the ETL module
                        to calculate statistics.
                    </p>
                </div>
            )}

            {data && data.statistics && !loading && !error && (
                <>
                    <div className="stats-summary-grid">
                        <div className="stats-summary-card">
                            <span>Records Analyzed</span>
                            <strong>
                                {formatValue(data.count)}
                            </strong>
                            <small>
                                Numeric {selectedMetric?.label.toLowerCase()} values
                            </small>
                        </div>

                        <div className="stats-summary-card">
                            <span>Mean</span>
                            <strong>
                                {formatValue(data.statistics.mean)}
                            </strong>
                            <small>Average value</small>
                        </div>

                        <div className="stats-summary-card">
                            <span>Median</span>
                            <strong>
                                {formatValue(data.statistics.median)}
                            </strong>
                            <small>Central value</small>
                        </div>

                        <div className="stats-summary-card">
                            <span>Standard Deviation</span>
                            <strong>
                                {formatValue(
                                    data.statistics.standardDeviation
                                )}
                            </strong>
                            <small>Sample variability</small>
                        </div>
                    </div>

                    <div className="stats-results-panel">
                        <div className="stats-results-heading">
                            <div>
                                <h4>Statistical Measures</h4>
                                <p>
                                    Detailed measures for{" "}
                                    {selectedMetric?.label}
                                </p>
                            </div>

                            <span>
                                {formatValue(data.count)} records
                            </span>
                        </div>

                        <div className="stats-results-grid">
                            {statisticLabels.map((item) => (
                                <div
                                    className="stats-result-item"
                                    key={item.key}
                                >
                                    <div>
                                        <strong>{item.label}</strong>
                                        <small>{item.description}</small>
                                    </div>

                                    <span>
                                        {formatValue(
                                            data.statistics[item.key]
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="stats-interpretation">
                        <span className="stats-interpretation-icon">
                            ∑
                        </span>

                        <div>
                            <strong>How to interpret</strong>
                            <p>
                                The mean represents the average, while the
                                median represents the center of the sorted
                                dataset. A larger standard deviation indicates
                                greater variability. The interquartile range
                                describes the spread of the middle 50% of values.
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default StatsModule;
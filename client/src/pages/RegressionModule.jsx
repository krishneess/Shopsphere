import { useEffect, useState } from "react";
import {
    ResponsiveContainer,
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    LineChart,
    Line,
} from "recharts";

import api from "../api";
import "./RegressionModule.css";

const API_URL = "/sales/regression";

export default function RegressionModule() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get(API_URL)
            .then((response) => setData(response.data))
            .catch((err) => {
                setError(
                    err.response?.data?.message ||
                        err.message ||
                        "Unable to load regression results."
                );
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="regression-status">
                Running regression model...
            </div>
        );
    }

    if (error) {
        return <div className="regression-error">{error}</div>;
    }

    if (!data || !data.predictions?.length) {
        return (
            <div className="regression-status">
                No regression predictions are available.
            </div>
        );
    }

    const metrics = data.metrics;

    return (
        <section className="regression-module">
            <div className="regression-heading">
                <div>
                    <h2>Regression Analysis</h2>
                    <p>
                        Multiple Linear Regression · Predicting unit price
                        using quantity and unit cost
                    </p>
                </div>

                <span className="regression-model-tag">
                    Model trained
                </span>
            </div>

            <div className="regression-kpis">
                <div className="regression-kpi">
                    <span>Mean Absolute Error</span>
                    <strong>{metrics.mae}</strong>
                </div>

                <div className="regression-kpi">
                    <span>Root Mean Squared Error</span>
                    <strong>{metrics.rmse}</strong>
                </div>

                <div className="regression-kpi">
                    <span>R² Score</span>
                    <strong>{metrics.r2 ?? "N/A"}</strong>
                </div>

                <div className="regression-kpi">
                    <span>Test Records</span>
                    <strong>{data.testingRecords}</strong>
                </div>
            </div>

            <div className="regression-chart-card">
                <div className="regression-chart-heading">
                    <h3>Actual vs Predicted Unit Price</h3>
                    <p>
                        Model predictions compared with actual test-set values
                    </p>
                </div>

                <ResponsiveContainer width="100%" height={320}>
                    <ScatterChart
                        margin={{
                            top: 15,
                            right: 25,
                            bottom: 35,
                            left: 25,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            type="number"
                            dataKey="actual"
                            name="Actual Price"
                            tick={{ fontSize: 12 }}
                            label={{
                                value: "Actual Unit Price",
                                position: "insideBottom",
                                offset: -15,
                            }}
                        />

                        <YAxis
                            type="number"
                            dataKey="predicted"
                            name="Predicted Price"
                            tick={{ fontSize: 12 }}
                            label={{
                                value: "Predicted Unit Price",
                                angle: -90,
                                position: "insideLeft",
                            }}
                        />

                        <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                        />

                        <Legend verticalAlign="bottom" />

                        <Scatter
                            name="Test Predictions"
                            data={data.predictions}
                            fill="#8b5cf6"
                        />
                    </ScatterChart>
                </ResponsiveContainer>
            </div>

            <div className="regression-chart-card">
                <div className="regression-chart-heading">
                    <h3>Gradient Descent Training Loss</h3>
                    <p>
                        Mean squared error recorded during model training
                    </p>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                        data={data.trainingLoss}
                        margin={{
                            top: 15,
                            right: 25,
                            bottom: 20,
                            left: 25,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />

                        <XAxis
                            dataKey="iteration"
                            tick={{ fontSize: 12 }}
                        />

                        <YAxis
                            tick={{ fontSize: 12 }}
                        />

                        <Tooltip />

                        <Legend verticalAlign="bottom" />

                        <Line
                            type="monotone"
                            dataKey="mse"
                            name="Training MSE"
                            stroke="#14b8a6"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="regression-info">
                <strong>Dataset split:</strong>{" "}
                {data.trainingRecords} training records and{" "}
                {data.testingRecords} testing records out of{" "}
                {data.totalRecords} valid records.
            </div>
        </section>
    );
}
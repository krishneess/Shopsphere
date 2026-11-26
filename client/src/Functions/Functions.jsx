import { useEffect, useRef, useState } from "react";
import "./Functions.css";

import ETLModule from "./ETL/ETLModule";
import EDAModule from "./EDA/EDAModule";
import OLAPModule from "./OLAP/OLAPModule";
import StatsModule from "./Statistics/StatsModule";
import SimpleRegression from "./SimpleRegression/SimpleRegression";
import MultipleRegression from "./MultipleRegression/MultipleRegression";
import AssociationRules from "./AssociationRules/AssociationRules";
import GainRatio from "./GainRatio/GainRatio";
import GiniIndex from "./GiniIndex/GiniIndex";
import UpdatedStatistics from "./UpdatedStatistics/UpdatedStatistics";

const modules = [
    {
        id: "etl",
        number: "01",
        icon: "⇄",
        title: "ETL & Data Quality",
        description:
            "Extract product data, identify data quality issues, and prepare clean data for analysis.",
        tags: ["Extract", "Transform", "Load"],
    },
    {
        id: "eda",
        number: "02",
        icon: "⌁",
        title: "Exploratory Data Analysis",
        description:
            "Explore product distributions, descriptive statistics, and inventory patterns.",
        tags: ["Statistics", "Patterns", "Insights"],
    },
    {
        id: "olap",
        number: "03",
        icon: "▦",
        title: "OLAP Explorer",
        description:
            "Explore multidimensional data using roll-up, drill-down, slice, dice, and pivot.",
        tags: ["OLAP", "Data Analysis", "Dimensions"],
    },
    {
        id: "stats",
        number: "04",
        icon: "∑",
        title: "Statistical Analysis",
        description:
            "Study relationships between variables and apply suitable statistical tests.",
        tags: ["Correlation", "Hypothesis Testing", "Statistics"],
    },
    {
        id: "simple-regression",
        number: "05",
        icon: "↗",
        title: "Simple Linear Regression",
        description:
            "Fit a least-squares line between two variables, test its significance, and predict new values.",
        tags: ["Least Squares", "R²", "Residuals"],
    },
    {
        id: "multiple-regression",
        number: "06",
        icon: "⩘",
        title: "Multiple Linear Regression",
        description:
            "Predict a target from several variables at once and compare how much each one matters.",
        tags: ["Normal Equations", "Adjusted R²", "VIF"],
    },
    {
        id: "association",
        number: "07",
        icon: "⛓",
        title: "Association Rule Mining",
        description:
            "Discover which products are bought together using the Apriori algorithm.",
        tags: ["Apriori", "Support", "Lift"],
    },
    {
        id: "gain-ratio",
        number: "08",
        icon: "⑂",
        title: "Gain Ratio",
        description:
            "Rank attributes for decision-tree splits using entropy, information gain and split info.",
        tags: ["Entropy", "Information Gain", "C4.5"],
    },
    {
        id: "gini",
        number: "09",
        icon: "◐",
        title: "Gini Index",
        description:
            "Measure class impurity and pick the split that reduces it the most.",
        tags: ["Impurity", "Gini Gain", "CART"],
    },
    {
        id: "updated-stats",
        number: "10",
        icon: "σ",
        title: "Updated Statistical Analysis",
        description:
            "Run Z, t, F, ANOVA and chi-square hypothesis tests on your sales data with the decision worked out for you.",
        tags: ["Z-test", "T-test", "F-test", "Chi-square"],
    },
];

function Functions() {
    const [activeModule, setActiveModule] = useState(null);
    const detailRef = useRef(null);

    // Bring the opened module into view (the card grid is tall)
    useEffect(() => {
        if (activeModule && detailRef.current) {
            detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [activeModule]);

    const selectedModule = modules.find(
        (module) => module.id === activeModule
    );

    return (
        <div className="functions-page">
            <header className="functions-header">
                <div>
                    <p className="functions-eyebrow">
                        DATA SCIENCE WORKSPACE
                    </p>

                    <h2>Analytics & Intelligence Lab</h2>

                    <p className="functions-subtitle">
                        Turn store data into meaningful insights through data
                        engineering, exploratory analysis, and decision support.
                    </p>
                </div>

                <div className="functions-header-badge">
                    <span className="functions-live-dot" />
                    Intelligence Workspace
                </div>
            </header>

            <section className="functions-intro">
                <div className="functions-intro-icon">✳</div>

                <div>
                    <h3>From raw data to decisions</h3>
                    <p>
                        Explore how ShopSphere connects application data,
                        data preparation, statistical analysis, and business
                        intelligence in one workflow.
                    </p>
                </div>
            </section>

            <section className="functions-modules-section">
                <div className="functions-section-heading">
                    <div>
                        <h3>Analysis Modules</h3>
                        <p>Select a module to explore its functionality.</p>
                    </div>

                    <span className="functions-module-count">
                        {String(modules.length).padStart(2, "0")} MODULES
                    </span>
                </div>

                <div className="functions-module-grid">
                    {modules.map((module) => (
                        <button
                            type="button"
                            key={module.id}
                            className={`functions-module-card ${
                                activeModule === module.id ? "selected" : ""
                            }`}
                            onClick={() =>
                                setActiveModule((current) =>
                                    current === module.id ? null : module.id
                                )
                            }
                            aria-expanded={activeModule === module.id}
                        >
                            <div className="functions-card-top">
                                <span className="functions-module-icon">
                                    {module.icon}
                                </span>

                                <span className="functions-module-number">
                                    {module.number}
                                </span>
                            </div>

                            <h4>{module.title}</h4>

                            <p>{module.description}</p>

                            <div className="functions-tags">
                                {module.tags.map((tag) => (
                                    <span key={tag}>{tag}</span>
                                ))}
                            </div>

                            <div className="functions-card-action">
                                <span>
                                    {activeModule === module.id
                                        ? "Close details"
                                        : "Explore module"}
                                </span>

                                <span aria-hidden="true">
                                    {activeModule === module.id ? "−" : "↗"}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </section>

            {selectedModule && (
                <section className="functions-module-detail" ref={detailRef}>
                    <div className="functions-detail-heading">
                        <div>
                            <p className="functions-eyebrow">
                                MODULE {selectedModule.number}
                            </p>

                            <h3>{selectedModule.title}</h3>
                        </div>

                        <button
                            type="button"
                            className="functions-close-button"
                            onClick={() => setActiveModule(null)}
                            aria-label="Close module details"
                        >
                            ✕
                        </button>
                    </div>

                    {selectedModule.id === "etl" ? (
                        <ETLModule />
                    ) : selectedModule.id === "eda" ? (
                        <EDAModule />
                    ) : selectedModule.id === "olap" ? (
                        <OLAPModule />
                    ) : selectedModule.id === "stats" ? (
                        <StatsModule />
                    ) : selectedModule.id === "simple-regression" ? (
                        <SimpleRegression />
                    ) : selectedModule.id === "multiple-regression" ? (
                        <MultipleRegression />
                    ) : selectedModule.id === "association" ? (
                        <AssociationRules />
                    ) : selectedModule.id === "gain-ratio" ? (
                        <GainRatio />
                    ) : selectedModule.id === "gini" ? (
                        <GiniIndex />
                    ) : selectedModule.id === "updated-stats" ? (
                        <UpdatedStatistics />
                    ) : null}

                    <section className="functions-workflow">
                        <div className="functions-workflow-heading">
                            <p className="functions-eyebrow">
                                THE BIG PICTURE
                            </p>

                            <h3>How the pieces work together</h3>
                        </div>

                        <div className="functions-workflow-steps">
                            <div className="functions-workflow-step">
                                <span>01</span>
                                <strong>Application Data</strong>
                                <p>Products and sales stored in MongoDB.</p>
                            </div>

                            <div className="functions-workflow-arrow">→</div>

                            <div className="functions-workflow-step">
                                <span>02</span>
                                <strong>ETL Processing</strong>
                                <p>Extract, validate, clean, and transform data.</p>
                            </div>

                            <div className="functions-workflow-arrow">→</div>

                            <div className="functions-workflow-step">
                                <span>03</span>
                                <strong>EDA & OLAP</strong>
                                <p>Analyze patterns, summaries, and dimensions.</p>
                            </div>

                            <div className="functions-workflow-arrow">→</div>

                            <div className="functions-workflow-step">
                                <span>04</span>
                                <strong>Decision Support</strong>
                                <p>Present evidence-based business insights.</p>
                            </div>
                        </div>
                    </section>

                    <footer className="functions-footer-note">
                        ShopSphere · E-Commerce Intelligence and Decision Support Platform
                    </footer>
                </section>
            )}
        </div>
    );
}

export default Functions;

import { useState } from "react";
import "./Functions.css";
import ETLModule from "./ETLModule";

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
];

function Functions() {
    const [activeModule, setActiveModule] = useState(null);

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
                        04 MODULES
                    </span>
                </div>

                <div className="functions-module-grid">
                    {modules.map((module) => (
                        <button
                            type="button"
                            key={module.id}
                            className={`functions-module-card ${activeModule === module.id ? "selected" : ""
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
                <section className="functions-module-detail">
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
                        <p>ETL module temporarily disabled for testing.</p>
                    ) : (
                        <>
                            <p className="functions-detail-description">
                                {selectedModule.description}
                            </p>

                            <div className="functions-detail-notice">
                                <strong>Module workspace</strong>

                                <p>
                                    This module will be implemented in the next development step.
                                </p>
                            </div>
                        </>
                    )}
                </section>
            )}


            <section className="functions-workflow">
                <div className="functions-workflow-heading">
                    <p className="functions-eyebrow">THE BIG PICTURE</p>
                    <h3>How the pieces work together</h3>
                </div>

                <div className="functions-workflow-steps">
                    <div className="functions-workflow-step">
                        <span>01</span>
                        <strong>Application Data</strong>
                        <p>Products and inventory stored in MongoDB.</p>
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
        </div>
    );
}

export default Functions;

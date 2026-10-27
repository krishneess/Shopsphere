
import { useState } from "react";
import "./ETLModule.css";

const API_URL = "http://localhost:5000/api/products";

function getProducts(response) {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.products)) return response.products;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

function validateAndClean(products) {
  return products.map((product, index) => {
    const issues = [];

    const name =
      typeof product.name === "string" ? product.name.trim() : "";

    const category =
      typeof product.category === "string"
        ? product.category.trim()
        : "";

    const price = Number(product.price);
    const stock = Number(product.stock);

    if (!name) issues.push("Missing product name");
    if (!category) issues.push("Missing category");

    if (
      product.price === "" ||
      product.price === null ||
      product.price === undefined ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      issues.push("Invalid price");
    }

    if (
      product.stock === "" ||
      product.stock === null ||
      product.stock === undefined ||
      !Number.isFinite(stock) ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      issues.push("Invalid stock");
    }

    return {
      ...product,
      name,
      category,
      price,
      stock,
      _etlId: product._id || product.id || `record-${index + 1}`,
      _etlIssues: issues,
      _etlClean: issues.length === 0,
    };
  });
}

function ETLModule() {
  const [products, setProducts] = useState([]);
  const [hasRun, setHasRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  async function runETL() {
    setLoading(true);
    setError("");
    setHasRun(false);

    try {
      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Backend returned HTTP ${response.status}`);
      }

      const data = await response.json();
      const extracted = getProducts(data);

      if (!Array.isArray(data) && extracted.length === 0) {
        throw new Error(
          "The API response format was unexpected. Check your GET /api/products response."
        );
      }

      setProducts(validateAndClean(extracted));
      setHasRun(true);
    } catch (err) {
      setError(
        `${err.message}. Make sure your backend is running on port 5000.`
      );
    } finally {
      setLoading(false);
    }
  }

  const cleanCount = products.filter((p) => p._etlClean).length;
  const issueCount = products.length - cleanCount;

  const visibleProducts = products.filter((product) => {
    if (filter === "clean") return product._etlClean;
    if (filter === "issues") return !product._etlClean;
    return true;
  });

  return (
    <div className="etl-module">
      <div className="etl-heading">
        <div>
          <p className="etl-eyebrow">DATA PIPELINE / MODULE 01</p>
          <h3>ETL & Data Quality</h3>
          <p>
            Extract product records, validate fields, and prepare
            a cleaned dataset for further analysis.
          </p>
        </div>

        <button
          type="button"
          className="etl-run-button"
          onClick={runETL}
          disabled={loading}
        >
          {loading ? "Processing..." : "▶ Run ETL"}
        </button>
      </div>

      <div className="etl-stats">
        <div className="etl-stat">
          <span>Records Extracted</span>
          <strong>{hasRun ? products.length : "—"}</strong>
        </div>

        <div className="etl-stat">
          <span>Clean Records</span>
          <strong>{hasRun ? cleanCount : "—"}</strong>
        </div>

        <div className="etl-stat">
          <span>Records With Issues</span>
          <strong>{hasRun ? issueCount : "—"}</strong>
        </div>

        <div className="etl-stat">
          <span>Data Quality</span>
          <strong>
            {hasRun
              ? products.length
                ? `${Math.round((cleanCount / products.length) * 100)}%`
                : "N/A"
              : "—"}
          </strong>
        </div>
      </div>

      {error && (
        <div className="etl-message etl-error" role="alert">
          <strong>ETL could not run</strong>
          <p>{error}</p>
        </div>
      )}

      {!hasRun && !error && (
        <div className="etl-empty">
          <span>⇄</span>
          <h4>Ready to process your data</h4>
          <p>
            Run the pipeline to fetch products from MongoDB through
            your existing backend API and check their data quality.
          </p>
        </div>
      )}

      {hasRun && (
        <>
          <div className="etl-results-heading">
            <div>
              <h4>Data Quality Report</h4>
              <p>Validation results for the extracted product records.</p>
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter ETL records"
            >
              <option value="all">All records</option>
              <option value="clean">Clean records</option>
              <option value="issues">Records with issues</option>
            </select>
          </div>

          {products.length === 0 ? (
            <div className="etl-empty">
              <h4>No products found</h4>
              <p>Your API returned an empty product list.</p>
            </div>
          ) : (
            <div className="etl-table-wrap">
              <table className="etl-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Validation</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleProducts.map((product) => (
                    <tr key={product._etlId}>
                      <td>{product.name || "—"}</td>
                      <td>{product.category || "—"}</td>
                      <td>
                        {Number.isFinite(product.price)
                          ? product.price
                          : "Invalid"}
                      </td>
                      <td>
                        {Number.isFinite(product.stock)
                          ? product.stock
                          : "Invalid"}
                      </td>
                      <td>
                        <span
                          className={`etl-status ${
                            product._etlClean ? "clean" : "issues"
                          }`}
                        >
                          {product._etlClean
                            ? "Clean"
                            : `${product._etlIssues.length} issue(s)`}
                        </span>

                        {!product._etlClean && (
                          <p className="etl-issue-text">
                            {product._etlIssues.join(", ")}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="etl-complete-note">
            <strong>Transformation complete</strong>
            <p>
              Text fields have been trimmed and numeric fields validated
              in the in-memory result. Original MongoDB records have not
              been modified.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default ETLModule;

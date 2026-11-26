import { useState } from "react";
import api from "../../api";
import "./ETLModule.css";

const API_URL = "/sales/upload";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function ETLModule() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    setError("");
    setResult(null);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const extension = selectedFile.name
      .split(".")
      .pop()
      .toLowerCase();

    if (!["csv", "xls", "xlsx"].includes(extension)) {
      setFile(null);
      setError("Please select a CSV, XLS, or XLSX file.");
      event.target.value = "";
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setError("The selected file exceeds the 10 MB limit.");
      event.target.value = "";
      return;
    }

    setFile(selectedFile);
  }

  function removeFile() {
    setFile(null);
    setResult(null);
    setError("");

    const input = document.getElementById("etl-sales-file");

    if (input) {
      input.value = "";
    }
  }

  async function runETL() {
    if (!file) {
      setError("Choose a dataset file before running ETL.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      // Must match the upload field expected by the backend.
      formData.append("salesFile", file);

      const response = await api.post(API_URL, formData);
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `${err.message}. Make sure your backend is running on port 5000.`
      );
    } finally {
      setLoading(false);
    }
  }

  const extractedCount = Number(result?.extractedCount);
  const acceptedCount = Number(result?.acceptedCount);
  const rejectedCount = Number(result?.rejectedCount);

  const dataQuality =
    Number.isFinite(extractedCount) &&
    Number.isFinite(acceptedCount) &&
    extractedCount > 0
      ? `${Math.round((acceptedCount / extractedCount) * 100)}%`
      : "N/A";

  return (
    <div className="etl-module">
      {/* Header */}
      <div className="etl-heading">
        <div>
          <p className="etl-eyebrow">DATA PIPELINE / MODULE 01</p>
          <h3>ETL & Data Quality</h3>
          <p>
            Upload your sales dataset, extract its records, and run
            the backend ETL pipeline to validate and import the data.
          </p>
        </div>

        <button
          type="button"
          className="etl-run-button"
          onClick={runETL}
          disabled={loading || !file}
        >
          {loading ? "Processing..." : "▶ Run ETL"}
        </button>
      </div>

      {/* Upload section */}
      <div className="etl-upload-panel">
        <div className="etl-upload-copy">
          <div className="etl-upload-icon">↑</div>

          <div>
            <h4>Upload your sales dataset</h4>
            <p>CSV, XLS, or XLSX · Maximum file size 10 MB</p>
          </div>
        </div>

        <input
          id="etl-sales-file"
          className="etl-file-input"
          type="file"
          accept=".csv,.xls,.xlsx"
          onChange={handleFileChange}
          disabled={loading}
        />

        <label
          htmlFor="etl-sales-file"
          className={`etl-file-button ${loading ? "disabled" : ""}`}
        >
          Select file
        </label>

        {file && (
          <div className="etl-selected-file">
            <div className="etl-file-details">
              <span className="etl-file-check">✓</span>

              <div className="etl-file-text">
                <strong>{file.name}</strong>
                <p>
                  {(file.size / 1024).toFixed(1)} KB · Ready to process
                </p>
              </div>
            </div>

            <button
              type="button"
              className="etl-remove-file"
              onClick={removeFile}
              disabled={loading}
              aria-label="Remove selected file"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="etl-message etl-error" role="alert">
          <strong>ETL could not run</strong>
          <p>{error}</p>
        </div>
      )}

      {/* Statistics */}
      <div className="etl-stats">
        <div className="etl-stat">
          <span>Records Extracted</span>
          <strong>
            {result ? result.extractedCount ?? "—" : "—"}
          </strong>
        </div>

        <div className="etl-stat">
          <span>Records Accepted</span>
          <strong>
            {result ? result.acceptedCount ?? "—" : "—"}
          </strong>
        </div>

        <div className="etl-stat">
          <span>Records Rejected</span>
          <strong>
            {result ? result.rejectedCount ?? "—" : "—"}
          </strong>
        </div>

        <div className="etl-stat">
          <span>Data Quality</span>
          <strong>{result ? dataQuality : "—"}</strong>
        </div>
      </div>

      {/* Empty state */}
      {!result && !error && (
        <div className="etl-empty">
          <span className="etl-empty-icon">⇄</span>
          <h4>Ready to process your data</h4>
          <p>
            Select your sales CSV or Excel file, then run the pipeline.
            The backend will validate and import the dataset.
          </p>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="etl-results-heading">
            <div>
              <h4>ETL Import Report</h4>
              <p>
                {result.message ||
                  "The backend has completed processing the uploaded dataset."}
              </p>
            </div>

            <span className="etl-success-badge">
              <span>✓</span> Completed
            </span>
          </div>

          <div className="etl-complete-note">
            <div className="etl-complete-icon">✓</div>

            <div>
              <strong>Transformation complete</strong>
              <p>
                {result.acceptedCount ?? 0} records were accepted and{" "}
                {result.rejectedCount ?? 0} records were rejected.
                The backend has processed the uploaded dataset.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ETLModule;
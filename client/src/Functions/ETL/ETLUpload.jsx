import { useState } from "react";
import api from "../../api";
import "./ETLUpload.css";

const API_URL = "/sales/upload";

export default function ETLUpload() {
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

        const allowedExtensions = [".csv", ".xlsx", ".xls"];
        const extension = selectedFile.name
            .slice(selectedFile.name.lastIndexOf("."))
            .toLowerCase();

        if (!allowedExtensions.includes(extension)) {
            setFile(null);
            setError("Please select a CSV, XLSX, or XLS file.");
            return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
            setFile(null);
            setError("File size must be 10 MB or less.");
            return;
        }

        setFile(selectedFile);
    }

    async function handleUpload() {
        if (!file) {
            setError("Choose a file before uploading.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const formData = new FormData();

            // Must match multer's upload.single("salesFile")
            formData.append("salesFile", file);

            const response = await api.post(API_URL, formData);
            setResult(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Could not connect to the backend. Check that the server is running."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="etl-upload">
            <div className="etl-upload-heading">
                <div>
                    <p className="etl-eyebrow">DATA INGESTION</p>
                    <h3>Upload Sales Dataset</h3>
                    <p>
                        Upload a sales CSV or Excel file to run the existing
                        backend ETL pipeline.
                    </p>
                </div>
            </div>

            <div className="etl-upload-box">
                <div className="etl-upload-icon">↑</div>

                <h4>Select your dataset</h4>
                <p>Supported formats: CSV, XLSX, XLS · Maximum size: 10 MB</p>

                <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileChange}
                    aria-label="Choose sales dataset"
                />

                {file && (
                    <div className="etl-selected-file">
                        <span>{file.name}</span>
                        <span>
                            {(file.size / 1024).toFixed(1)} KB
                        </span>
                    </div>
                )}

                <button
                    type="button"
                    className="etl-upload-button"
                    onClick={handleUpload}
                    disabled={!file || loading}
                >
                    {loading ? "Uploading and processing…" : "Upload & Run ETL"}
                </button>
            </div>

            {error && (
                <div className="etl-result etl-result-error" role="alert">
                    <strong>Upload failed</strong>
                    <p>{error}</p>
                </div>
            )}

            {result && (
                <div className="etl-result etl-result-success">
                    <div className="etl-result-title">
                        <span className="etl-success-icon">✓</span>
                        <div>
                            <strong>Dataset imported successfully</strong>
                            <p>{result.filename || file?.name}</p>
                        </div>
                    </div>

                    <div className="etl-result-stats">
                        <div>
                            <span>Extracted</span>
                            <strong>{result.extractedCount ?? "—"}</strong>
                        </div>
                        <div>
                            <span>Accepted</span>
                            <strong>{result.acceptedCount ?? "—"}</strong>
                        </div>
                        <div>
                            <span>Rejected</span>
                            <strong>{result.rejectedCount ?? "—"}</strong>
                        </div>
                    </div>

                    {Array.isArray(result.rejected) &&
                        result.rejected.length > 0 && (
                            <details className="etl-rejected-details">
                                <summary>View rejected records</summary>
                                <pre>
                                    {JSON.stringify(result.rejected, null, 2)}
                                </pre>
                            </details>
                        )}
                </div>
            )}
        </div>
    );
}
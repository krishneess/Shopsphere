import { useCallback, useEffect, useState } from "react";
import "./AccountManagement.css";

const API_URL = "http://localhost:5000/api/account/profile";

const EMPTY_PROFILE = {
  fullName: "",
  email: "",
  phone: "",
  storeName: "",
  storeAddress: "",
  avatar: "",
  role: "",
  status: "",
};

const PROFILE_FIELDS = [
  { name: "fullName", label: "Full Name", required: true, maxLength: 120 },
  { name: "email", label: "Email", type: "email", required: true, maxLength: 254 },
  { name: "phone", label: "Phone", type: "tel", maxLength: 30 },
  { name: "storeName", label: "Store Name", required: true, maxLength: 120 },
  { name: "storeAddress", label: "Store Address", multiline: true, maxLength: 500 },
  { name: "avatar", label: "Avatar URL", type: "url", maxLength: 2048 },
  { name: "role", label: "Role", required: true, maxLength: 80 },
  { name: "status", label: "Status", required: true, maxLength: 40 },
];

function AccountManagement({ onBack }) {
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [profileNotFound, setProfileNotFound] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const applyProfileData = useCallback((data) => {
    setProfile({ ...EMPTY_PROFILE, ...data.profile });
    setProfileNotFound(false);
    setLoadError("");
  }, []);

  const applyProfileError = useCallback((status) => {
    if (status === 404) {
      setProfile(EMPTY_PROFILE);
      setProfileNotFound(true);
      setLoadError("");
    } else {
      setLoadError("Unable to load the account profile. Check that the backend is running.");
    }
  }, []);

  useEffect(() => {
    let active = true;

    fetch(API_URL)
      .then(async (res) => {
        const data = await res.json();
        if (!active) return;
        if (res.ok) applyProfileData(data);
        else applyProfileError(res.status);
      })
      .catch(() => {
        if (active) applyProfileError(500);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [applyProfileData, applyProfileError]);

  function retryLoadProfile() {
    setLoading(true);
    setLoadError("");
    setSuccessMessage("");
    fetch(API_URL)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) applyProfileData(data);
        else applyProfileError(res.status);
      })
      .catch(() => applyProfileError(500))
      .finally(() => setLoading(false));
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setSaveError("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setSaveError("");
    setFieldErrors({});
    setSuccessMessage("");

    const payload = Object.fromEntries(
      Object.keys(EMPTY_PROFILE).map((field) => [
        field,
        profile[field].trim(),
      ])
    );

    try {
      const res = await fetch(API_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile({ ...EMPTY_PROFILE, ...data.profile });
        setProfileNotFound(false);
        setSuccessMessage(data.message || "Account profile saved successfully.");
      } else {
        setSaveError(data.message || "Unable to save the account profile.");
        setFieldErrors(data.errors || {});
      }
    } catch {
      setSaveError("Unable to save the account profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="account-page">
        <button type="button" className="account-return" onClick={onBack}>
          ← Return to workspace
        </button>
        <div className="account-card account-loading" role="status">
          Loading account profile…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="account-page">
        <button type="button" className="account-return" onClick={onBack}>
          ← Return to workspace
        </button>
        <div className="account-card">
          <div className="account-alert account-alert--error" role="alert">
            {loadError}
          </div>
          <button className="secondary-button" onClick={retryLoadProfile}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      <button type="button" className="account-return" onClick={onBack}>
        ← Return to workspace
      </button>
      <section className="account-card">
        <div className="account-card-heading">
          <div className="account-heading-mark" aria-hidden="true">
            AM
          </div>
          <div>
            <h2>Profile details</h2>
            <p>Manage the store manager and store contact information.</p>
          </div>
        </div>

        {profileNotFound && (
          <div className="account-alert account-alert--info" role="status">
            No profile exists yet. Complete the form to create the store manager
            profile.
          </div>
        )}

        {saveError && (
          <div className="account-alert account-alert--error" role="alert">
            <p>{saveError}</p>
            {Object.keys(fieldErrors).length > 0 && (
              <ul>
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    {field}: {message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {successMessage && (
          <div className="account-alert account-alert--success" role="status">
            {successMessage}
          </div>
        )}

        <form className="account-form" onSubmit={handleSubmit} noValidate>
          <div className="account-fields">
            {PROFILE_FIELDS.map((field) => {
              const error = fieldErrors[field.name];
              const inputId = `account-${field.name}`;
              const errorId = `${inputId}-error`;

              return (
                <div
                  className={`account-field ${
                    field.multiline ? "account-field--wide" : ""
                  }`}
                  key={field.name}
                >
                  <label htmlFor={inputId}>
                    {field.label}
                    {field.required && <span aria-hidden="true"> *</span>}
                  </label>
                  {field.multiline ? (
                    <textarea
                      id={inputId}
                      name={field.name}
                      value={profile[field.name]}
                      onChange={handleChange}
                      maxLength={field.maxLength}
                      rows={3}
                      required={field.required}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                    />
                  ) : (
                    <input
                      id={inputId}
                      name={field.name}
                      type={field.type || "text"}
                      value={profile[field.name]}
                      onChange={handleChange}
                      maxLength={field.maxLength}
                      required={field.required}
                      autoComplete={
                        field.name === "fullName"
                          ? "name"
                          : field.name === "email"
                            ? "email"
                            : field.name === "phone"
                              ? "tel"
                              : "off"
                      }
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                    />
                  )}
                  {error && (
                    <span className="account-field-error" id={errorId}>
                      {error}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="account-form-footer">
            <span className="account-required-note">* Required fields</span>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AccountManagement;

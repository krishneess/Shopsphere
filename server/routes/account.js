const express = require("express");
const { getDB } = require("../config");

const router = express.Router();
const ACCOUNT_ID = "store-manager";

const PROFILE_FIELDS = [
    "fullName",
    "email",
    "phone",
    "storeName",
    "storeAddress",
    "avatar",
    "role",
    "status"
];

function validateProfile(body) {
    const errors = {};
    const profile = {};

    for (const field of PROFILE_FIELDS) {
        const value = typeof body?.[field] === "string" ? body[field].trim() : "";
        profile[field] = value;
    }

    if (!profile.fullName) errors.fullName = "Full name is required.";
    if (!profile.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
        errors.email = "Provide a valid email address.";
    if (!profile.storeName) errors.storeName = "Store name is required.";
    if (!profile.role) errors.role = "Role is required.";
    if (!profile.status) errors.status = "Status is required.";

    return { profile, errors };
}

function serializeProfile(document) {
    return Object.fromEntries(
        PROFILE_FIELDS.map((field) => [field, document[field] ?? ""])
    );
}

router.get("/profile", async (req, res) => {
    try {
        const document = await getDB()
            .collection("accountProfiles")
            .findOne({ _id: ACCOUNT_ID });

        if (!document) {
            return res.status(404).json({
                message: "Store manager profile has not been created."
            });
        }

        return res.json({ profile: serializeProfile(document) });
    } catch {
        console.error("Fetch account profile request failed.");
        return res.status(500).json({
            message: "Failed to fetch store manager profile."
        });
    }
});

router.put("/profile", async (req, res) => {
    const { profile, errors } = validateProfile(req.body);

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({
            message: "Invalid store manager profile.",
            errors
        });
    }

    try {
        const db = getDB();
        const collection = db.collection("accountProfiles");
        const existing = await collection.findOne(
            { _id: ACCOUNT_ID },
            { projection: { createdAt: 1 } }
        );

        const now = new Date();
        const document = {
            _id: ACCOUNT_ID,
            ...profile,
            createdAt: existing?.createdAt || now,
            updatedAt: now
        };

        await collection.replaceOne({ _id: ACCOUNT_ID }, document, { upsert: true });

        return res.json({
            message: "Store manager profile updated successfully.",
            profile: serializeProfile(document)
        });
    } catch {
        console.error("Update account profile request failed.");
        return res.status(500).json({
            message: "Failed to update store manager profile."
        });
    }
});

module.exports = router;

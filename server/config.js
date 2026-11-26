
const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
    if (db) return db;

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("MONGODB_URI is missing from .env");
    }

    client = new MongoClient(uri);
    await client.connect();

    db = client.db("shopsphere");

    await db.command({ ping: 1 });

    console.log("MongoDB Atlas connected successfully!");

    return db;
}

function getDB() {
    if (!db) {
        throw new Error("Database is not connected");
    }

    return db;
}

async function closeDB() {
    if (!client) return;

    await client.close();
    client = undefined;
    db = undefined;
}

module.exports = { connectDB, getDB, closeDB };

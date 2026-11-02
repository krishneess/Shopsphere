
const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDB } = require("./config");
const productRoutes = require("./routes/products");
const salesRoutes = require("./routes/sales");



const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Diagnostic log
console.log("Product routes loaded");

// Product API routes
app.use("/api/products", productRoutes);
app.use("/api/sales", salesRoutes);

app.get("/api/products/:id", async (req, res) => {
    try {
        const { ObjectId } = require("mongodb");
        const { getDB } = require("./config");
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid product ID"
            });
        }

        const product = await getDB()
            .collection("products")
            .findOne({ _id: new ObjectId(id) });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        return res.status(200).json(product);
    } catch (error) {
        console.error("GET product by ID error:", error);
        return res.status(500).json({
            message: "Failed to fetch product"
        });
    }
});


// Root route
app.get("/", (req, res) => {
    res.json({
        message: "ShopSphere API is running!",
        status: "success"
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        server: "running",
        database: "connected"
    });
});

// Start server after connecting to MongoDB
async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(
                `ShopSphere server running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Failed to start ShopSphere:", error.message);
        process.exit(1);
    }
}

startServer();

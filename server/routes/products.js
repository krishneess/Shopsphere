
const express = require("express");
const { getDB } = require("../config");
const { ObjectId } = require("mongodb");

const router = express.Router();

// GET: Fetch all products
router.get("/", async (req, res) => {
    try {
        const products = await getDB()
            .collection("products")
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch products" });
    }
});

// POST: Add a new product
router.post("/", async (req, res) => {
    try {
        const { name, category, price, stock, description } = req.body;

        if (
            !name?.trim() ||
            !category?.trim() ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            return res.status(400).json({
                message: "Provide a name, category, valid price and stock quantity"
            });
        }

        const product = {
            name: name.trim(),
            category: category.trim(),
            price,
            stock,
            description: description?.trim() || "",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await getDB()
            .collection("products")
            .insertOne(product);

        res.status(201).json({
            message: "Product added successfully",
            product: { _id: result.insertedId, ...product }
        });
    } catch (error) {
        res.status(500).json({ message: "Failed to add product" });
    }
});

// PUT: Update a product
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, price, stock, description } = req.body;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        if (
            !name?.trim() ||
            !category?.trim() ||
            !Number.isFinite(price) ||
            price < 0 ||
            !Number.isInteger(stock) ||
            stock < 0
        ) {
            return res.status(400).json({
                message: "Provide a name, category, valid price and stock quantity"
            });
        }

        const result = await getDB().collection("products").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    name: name.trim(),
                    category: category.trim(),
                    price,
                    stock,
                    description: description?.trim() || "",
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product updated successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to update product" });
    }
});

// DELETE: Remove a product
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid product ID" });
        }

        const result = await getDB()
            .collection("products")
            .deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete product" });
    }
});


// GET: Fetch a single product by ID
router.get("/:id", async (req, res) => {
    try {
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

        res.json(product);
    } catch (error) {
        console.error("Fetch product error:", error);
        res.status(500).json({
            message: "Failed to fetch product"
        });
    }
});


module.exports = router;

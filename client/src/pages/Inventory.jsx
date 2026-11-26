
import { useEffect, useMemo, useState } from "react";
import api from "../api";
import "./Inventory.css";

const API_URL = "/products";

const emptyProduct = {
  name: "",
  category: "",
  price: "",
  stock: "",
  description: "",
};

function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  async function fetchProducts() {
    try {
      setError("");
      const response = await api.get(API_URL);
      setProducts(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load products. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  function openAddForm() {
    setEditingId(null);
    setFormData(emptyProduct);
    setShowForm(true);
  }

  function openEditForm(product) {
    setEditingId(product._id);
    setFormData({
      name: product.name || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? ""),
      description: product.description || "",
    });
    setShowForm(true);
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      name: formData.name.trim(),
      category: formData.category.trim(),
      price: Number(formData.price),
      stock: Number(formData.stock),
      description: formData.description.trim(),
    };

    try {
      if (editingId) {
        await api.put(`${API_URL}/${editingId}`, payload);
      } else {
        await api.post(API_URL, payload);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData(emptyProduct);
      await fetchProducts();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not save the product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}" from inventory?`
    );

    if (!confirmed) return;

    try {
      setError("");
      await api.delete(`${API_URL}/${product._id}`);
      await fetchProducts();
    } catch (err) {
      setError(
        err.response?.data?.message || "Could not delete the product."
      );
    }
  }

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = products.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const category = (product.category || "").toLowerCase();
      const stock = Number(product.stock) || 0;

      const matchesSearch =
        !query || name.includes(query) || category.includes(query);

      let matchesStock = true;

      if (stockFilter === "in-stock") {
        matchesStock = stock > 5;
      } else if (stockFilter === "low-stock") {
        matchesStock = stock > 0 && stock <= 5;
      } else if (stockFilter === "out-of-stock") {
        matchesStock = stock === 0;
      }

      return matchesSearch && matchesStock;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "price-asc":
          return Number(a.price) - Number(b.price);
        case "price-desc":
          return Number(b.price) - Number(a.price);
        case "stock-asc":
          return Number(a.stock) - Number(b.stock);
        case "stock-desc":
          return Number(b.stock) - Number(a.stock);
        case "name-asc":
          return (a.name || "").localeCompare(b.name || "");
        case "newest":
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });

    return result;
  }, [products, search, stockFilter, sortBy]);

  const lowStockCount = products.filter(
    (product) =>
      Number(product.stock) > 0 && Number(product.stock) <= 5
  ).length;

  const outOfStockCount = products.filter(
    (product) => Number(product.stock) === 0
  ).length;

  const inventoryValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) * Number(product.stock || 0),
    0
  );

  const hasActiveFilters =
    search !== "" ||
    stockFilter !== "all" ||
    sortBy !== "newest";

  function resetFilters() {
    setSearch("");
    setStockFilter("all");
    setSortBy("newest");
  }

  const formatCurrency = (amount) =>
    Number(amount || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="inventory-page">
      <div className="inventory-heading">
        <div>
          <p className="eyebrow">STORE OPERATIONS</p>
          <h1>Inventory</h1>
          <p className="subtitle">
            Manage products, prices and available stock.
          </p>
        </div>

        <button className="primary-button" onClick={openAddForm}>
          + Add Product
        </button>
      </div>

      {error && (
        <div className="inventory-alert" role="alert">
          <span>{error}</span>
          <button
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <div className="inventory-stats">
        <div className="inventory-stat">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>

        <div className="inventory-stat">
          <span>Inventory value</span>
          <strong>{formatCurrency(inventoryValue)}</strong>
        </div>

        <div className="inventory-stat">
          <span>Low stock (1–5)</span>
          <strong>{lowStockCount}</strong>
        </div>
      </div>

      <div className="inventory-table-card">
        <div className="inventory-toolbar">
          <div>
            <h3>All Products</h3>
            <p>
              {loading
                ? "Loading products..."
                : `${filteredProducts.length} of ${products.length} products displayed`}
            </p>
          </div>

          <input
            className="inventory-search"
            type="search"
            placeholder="Search name or category..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search products by name or category"
          />
        </div>

        <div className="inventory-filters">
          <div className="inventory-filter-field">
            <label htmlFor="stock-filter">Stock status</label>
            <select
              id="stock-filter"
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option value="all">All stock statuses</option>
              <option value="in-stock">In stock (more than 5)</option>
              <option value="low-stock">Low stock (1–5)</option>
              <option value="out-of-stock">Out of stock (0)</option>
            </select>
          </div>

          <div className="inventory-filter-field">
            <label htmlFor="sort-filter">Sort products by</label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="newest">Recently added</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-asc">Stock: Low to High</option>
              <option value="stock-desc">Stock: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>

          <button
            type="button"
            className="secondary-button filter-reset"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            Reset filters
          </button>
        </div>

        {loading ? (
          <div className="inventory-message">
            Loading inventory...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="inventory-message">
            {products.length === 0
              ? "No products yet. Add your first product to get started."
              : "No products match your search or filters."}

            {hasActiveFilters && (
              <div className="inventory-empty-action">
                <button
                  className="secondary-button"
                  onClick={resetFilters}
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="inventory-table-wrapper">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => {
                  const stock = Number(product.stock) || 0;

                  return (
                    <tr key={product._id}>
                      <td>
                        <div className="product-name">
                          {product.name}
                        </div>

                        {product.description && (
                          <div className="product-description">
                            {product.description}
                          </div>
                        )}
                      </td>

                      <td>{product.category}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{stock}</td>

                      <td>
                        <span
                          className={`stock-badge ${
                            stock === 0
                              ? "out-of-stock"
                              : stock <= 5
                                ? "low-stock"
                                : "in-stock"
                          }`}
                        >
                          {stock === 0
                            ? "Out of stock"
                            : stock <= 5
                              ? "Low stock"
                              : "In stock"}
                        </span>
                      </td>

                      <td>
                        <div className="product-actions">
                          <button
                            className="action-button"
                            onClick={() => openEditForm(product)}
                          >
                            Edit
                          </button>

                          <button
                            className="action-button delete-action"
                            onClick={() => handleDelete(product)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div
          className="inventory-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              setShowForm(false);
            }
          }}
        >
          <div
            className="inventory-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-form-title"
          >
            <div className="modal-heading">
              <div>
                <h2 id="product-form-title">
                  {editingId ? "Edit Product" : "Add Product"}
                </h2>
                <p>Enter the product details below.</p>
              </div>

              <button
                className="modal-close"
                onClick={() => setShowForm(false)}
                disabled={saving}
                aria-label="Close form"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Product name
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  maxLength={120}
                  placeholder="e.g. Wireless Headphones"
                />
              </label>

              <label>
                Category
                <input
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  maxLength={80}
                  placeholder="e.g. Electronics"
                />
              </label>

              <div className="form-row">
                <label>
                  Price (₹)
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </label>

                <label>
                  Stock quantity
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stock}
                    onChange={handleChange}
                    required
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  maxLength={500}
                  rows={3}
                  placeholder="Optional product description"
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowForm(false)}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Save Changes"
                      : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;

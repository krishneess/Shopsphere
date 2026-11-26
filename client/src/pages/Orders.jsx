import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CATALOG,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  formatDate,
  formatDateTime,
  formatINR,
  getItemCount,
  getOrderTotal,
  loadOrders,
  resetOrders,
  saveOrders,
  summarize,
} from "../data/orders";
import "./Orders.css";

const emptyForm = {
  customer: "",
  city: "",
  payment: PAYMENT_METHODS[0],
  sku: CATALOG[0].sku,
  quantity: 1,
};

function statusClass(status) {
  return `order-badge order-badge--${status.toLowerCase()}`;
}

function Orders() {
  const [orders, setOrders] = useState(loadOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  const sorted = useMemo(
    () => [...orders].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [orders]
  );

  const filtered = sorted.filter((order) => {
    const matchesStatus = statusFilter === "All" || order.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      order.id.toLowerCase().includes(term) ||
      order.customer.toLowerCase().includes(term) ||
      order.city.toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  const stats = summarize(orders);

  const chartData = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i -= 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ key: d.toDateString(), label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue: 0 });
    }
    orders.forEach((order) => {
      if (order.status === "Cancelled") return;
      const slot = days.find((d) => d.key === new Date(order.date).toDateString());
      if (slot) slot.revenue += getOrderTotal(order);
    });
    return days;
  }, [orders]);

  const selected = orders.find((order) => order.id === selectedId) || null;

  function updateStatus(id, status) {
    setOrders((current) =>
      current.map((order) => {
        if (order.id !== id) return order;
        let paymentStatus = order.paymentStatus;
        if (status === "Cancelled") paymentStatus = "Refunded";
        else if (status === "Delivered") paymentStatus = "Paid";
        else if (paymentStatus === "Refunded") paymentStatus = "Paid";
        return { ...order, status, paymentStatus };
      })
    );
  }

  function handleField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  function createOrder(event) {
    event.preventDefault();
    const quantity = Number(form.quantity);

    if (!form.customer.trim() || !form.city.trim()) {
      setFormError("Customer name and city are required.");
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      setFormError("Quantity must be a whole number between 1 and 99.");
      return;
    }

    const product = CATALOG.find((p) => p.sku === form.sku);
    const nextNumber =
      orders.reduce((max, o) => Math.max(max, Number(o.id.replace("SS-", "")) || 0), 1000) + 1;

    const order = {
      id: `SS-${nextNumber}`,
      customer: form.customer.trim(),
      city: form.city.trim(),
      date: new Date().toISOString(),
      status: "Pending",
      payment: form.payment,
      paymentStatus: form.payment === "Cash on Delivery" ? "Pending" : "Paid",
      items: [{ ...product, quantity }],
    };

    setOrders((current) => [order, ...current]);
    setForm(emptyForm);
    setFormError("");
    setShowForm(false);
    setSelectedId(order.id);
  }

  function handleReset() {
    if (window.confirm("Reset all orders back to the original demo data?")) {
      setOrders(resetOrders());
      setSelectedId(null);
    }
  }

  return (
    <div className="orders-page">
      <div className="orders-stats">
        <div className="orders-stat">
          <p>Total Orders</p>
          <h2>{stats.total}</h2>
          <small>All recorded transactions</small>
        </div>
        <div className="orders-stat">
          <p>Revenue</p>
          <h2>{formatINR(stats.revenue)}</h2>
          <small>Excludes cancelled orders</small>
        </div>
        <div className="orders-stat">
          <p>Open Orders</p>
          <h2>{stats.open}</h2>
          <small>Pending or processing</small>
        </div>
        <div className="orders-stat">
          <p>Avg. Order Value</p>
          <h2>{formatINR(stats.avg)}</h2>
          <small>Revenue per completed order</small>
        </div>
      </div>

      <div className="orders-card">
        <div className="orders-card-head">
          <div>
            <h3>Revenue — last 14 days</h3>
            <p>Daily sales from non-cancelled orders.</p>
          </div>
        </div>
        <div className="orders-chart">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "var(--border)" }} interval={1} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} tickLine={false} axisLine={false} width={54} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip
                formatter={(value) => [formatINR(value), "Revenue"]}
                cursor={{ fill: "var(--surface-hover)" }}
                contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }}
              />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="orders-card">
        <div className="orders-card-head">
          <div>
            <h3>Order Transactions</h3>
            <p>
              Showing {filtered.length} of {orders.length} orders. Click a row for details.
            </p>
          </div>
          <div className="orders-head-actions">
            <button type="button" className="orders-btn orders-btn--ghost" onClick={handleReset}>
              Reset demo data
            </button>
            <button type="button" className="orders-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Close" : "+ New Order"}
            </button>
          </div>
        </div>

        {showForm && (
          <form className="orders-form" onSubmit={createOrder} noValidate>
            <label>
              Customer
              <input name="customer" value={form.customer} onChange={handleField} placeholder="e.g. Rahul Verma" />
            </label>
            <label>
              City
              <input name="city" value={form.city} onChange={handleField} placeholder="e.g. Pune" />
            </label>
            <label>
              Product
              <select name="sku" value={form.sku} onChange={handleField}>
                {CATALOG.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.name} — {formatINR(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Quantity
              <input name="quantity" type="number" min="1" max="99" value={form.quantity} onChange={handleField} />
            </label>
            <label>
              Payment
              <select name="payment" value={form.payment} onChange={handleField}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </label>
            <div className="orders-form-actions">
              <button type="submit" className="orders-btn">
                Place Order
              </button>
            </div>
            {formError && <p className="orders-form-error">{formError}</p>}
          </form>
        )}

        <div className="orders-filters">
          <input
            type="search"
            placeholder="Search by order ID, customer or city"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search orders"
          />
          <div className="orders-chips">
            {["All", ...ORDER_STATUSES].map((status) => (
              <button
                key={status}
                type="button"
                className={`orders-chip ${statusFilter === status ? "active" : ""}`}
                onClick={() => setStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="orders-table-wrap">
          <table className="table align-middle orders-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="7" className="orders-empty">
                    No orders match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((order) => (
                <tr
                  key={order.id}
                  className={`orders-row ${selectedId === order.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(order.id === selectedId ? null : order.id)}
                >
                  <td><strong>{order.id}</strong></td>
                  <td>
                    {order.customer}
                    <small className="orders-sub">{order.city}</small>
                  </td>
                  <td>{formatDate(order.date)}</td>
                  <td>{getItemCount(order)}</td>
                  <td>
                    {order.payment}
                    <small className="orders-sub">{order.paymentStatus}</small>
                  </td>
                  <td>{formatINR(getOrderTotal(order))}</td>
                  <td><span className={statusClass(order.status)}>{order.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="orders-card orders-detail">
          <div className="orders-card-head">
            <div>
              <h3>
                Order {selected.id}{" "}
                <span className={statusClass(selected.status)}>{selected.status}</span>
              </h3>
              <p>
                {selected.customer}, {selected.city} · placed {formatDateTime(selected.date)} ·{" "}
                {selected.payment} ({selected.paymentStatus})
              </p>
            </div>
            <div className="orders-head-actions">
              <label className="orders-status-select">
                Update status
                <select value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="orders-btn orders-btn--ghost" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
          </div>

          <table className="table align-middle orders-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product</th>
                <th>Category</th>
                <th>Unit price</th>
                <th>Qty</th>
                <th>Line total</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((item) => (
                <tr key={item.sku}>
                  <td>{item.sku}</td>
                  <td><strong>{item.name}</strong></td>
                  <td>{item.category}</td>
                  <td>{formatINR(item.price)}</td>
                  <td>{item.quantity}</td>
                  <td>{formatINR(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="orders-grand-total">
            Order total <strong>{formatINR(getOrderTotal(selected))}</strong>
          </p>
        </div>
      )}
    </div>
  );
}

export default Orders;

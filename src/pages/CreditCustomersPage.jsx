// pages/CreditCustomersPage.jsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/CreditCustomersPage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

/* ═══════════════════════════════════════════════════════════
   CUSTOMER DETAIL MODAL - Shows transactions and payment form
════════════════════════════════════════════════════════════ */
function CustomerDetailModal({ customer, onClose, onUpdated }) {
  const [sales, setSales] = useState([]);
  const [loadingSales, setLoadS] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payRemarks, setPayRemarks] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState({ text: "", type: "" });
  const [activeTab, setActiveTab] = useState("history");
  const [selectedSale, setSelectedSale] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(customer);
  const payRef = useRef(null);

  // Load customer transaction history
  useEffect(() => {
    loadSales();
    loadCustomerBalance();
  }, [customer._id]);

  const loadCustomerBalance = async () => {
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ONE(customer._id));
      if (data.success) {
        setCurrentCustomer(data.data);
      }
    } catch (err) {
      console.error("Failed to load customer balance:", err);
    }
  };

  const loadSales = async () => {
    setLoadS(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.SALE_HISTORY(customer._id));
      if (data.success) setSales(data.data || []);
    } catch (err) {
      console.error("Failed to load sales:", err);
    }
    setLoadS(false);
  };

  const showPayMsg = (text, type = "success") => {
    setPayMsg({ text, type });
    setTimeout(() => setPayMsg({ text: "", type: "" }), 3000);
  };

  // Record payment and update balance
  const handlePay = async () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      showPayMsg("Please enter a valid amount", "error");
      return;
    }
    
    if (amt > (currentCustomer.currentBalance || 0)) {
      showPayMsg(`Amount cannot exceed outstanding balance of PKR ${fmt(currentCustomer.currentBalance)}`, "error");
      return;
    }
    
    setPaying(true);
    try {
      // Record payment
      const { data } = await api.post("/payments", {
        customerId: customer._id,
        amount: amt,
        remarks: payRemarks,
        paymentDate: isoD(),
      });
      
      if (data.success) {
        // Update customer balance directly
        const balanceResponse = await api.patch(`/customers/${customer._id}/balance`, {
          amount: amt,
          operation: "subtract"
        });
        
        if (balanceResponse.data.success) {
          showPayMsg(`PKR ${fmt(amt)} payment recorded successfully. New balance: PKR ${fmt(balanceResponse.data.data.currentBalance)}`, "success");
          setPayAmount("");
          setPayRemarks("");
          await loadSales();
          await loadCustomerBalance();
          if (onUpdated) onUpdated();
        } else {
          showPayMsg("Payment recorded but balance update failed", "error");
        }
      } else {
        showPayMsg(data.message || "Payment failed", "error");
      }
    } catch (e) {
      console.error("Payment error:", e);
      showPayMsg(e.response?.data?.message || "Payment failed", "error");
    }
    setPaying(false);
  };

  // Send WhatsApp statement
  const sendWhatsAppHistory = () => {
    const saleTxns = sales.filter((s) => s.saleType === "sale");
    const returnTxns = sales.filter((s) => s.saleType === "return");
    const totalSales = saleTxns.reduce((s, x) => s + (x.netTotal || 0), 0);
    const totalPaid = saleTxns.reduce((s, x) => s + (x.paidAmount || 0), 0);
    const totalReturn = returnTxns.reduce((s, x) => s + (x.netTotal || 0), 0);
    const outstanding = currentCustomer.currentBalance || 0;
    
    const separator = "━".repeat(30);
    const dash = "─".repeat(30);
    
    const invoiceLines = sales
      .slice(0, 10)
      .map((s, i) => {
        const typeLabel = s.saleType === "return" ? "RETURN" : "SALE";
        return `${i + 1}. ${typeLabel} | ${s.invoiceNo} | ${s.invoiceDate}\n   Net: PKR ${fmt(s.netTotal || 0)} | Paid: PKR ${fmt(s.paidAmount || 0)}${s.balance > 0 ? ` | Bal: PKR ${fmt(s.balance)}` : " (Clear)"}`;
      })
      .join(`\n${dash}\n`);
    
    const message = `${separator}\n*ASIM ELECTRIC & ELECTRONIC STORE*\n*CUSTOMER ACCOUNT STATEMENT*\n${separator}\n*${currentCustomer.name}*${currentCustomer.phone ? "\n📞 " + currentCustomer.phone : ""}${currentCustomer.code ? "\n🆔 Code: " + currentCustomer.code : ""}\n📅 Date: ${isoD()}\n${separator}\n💰 Total Purchases: PKR ${fmt(totalSales)}\n↩️ Total Returns:   PKR ${fmt(totalReturn)}\n💵 Total Paid:      PKR ${fmt(totalPaid)}\n⚠️ *Outstanding:    PKR ${fmt(outstanding)}*\n${separator}\n${invoiceLines}\n${separator}\n_Thank you for your business!_`;
    
    window.open(
      `https://wa.me/${(currentCustomer.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
  };

  // Calculate statistics
  const saleTxns = sales.filter((s) => s.saleType === "sale");
  const returnTxns = sales.filter((s) => s.saleType === "return");
  const totalSales = saleTxns.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPaid = saleTxns.reduce((s, x) => s + (x.paidAmount || 0), 0);
  const totalReturn = returnTxns.reduce((s, x) => s + (x.netTotal || 0), 0);
  const outstanding = currentCustomer.currentBalance || 0;

  return (
    <div className="xp-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="xp-modal" style={{ maxWidth: 1000, width: "90%" }}>
        {/* Modal Header */}
        <div className="xp-modal-tb">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="rgba(255,255,255,0.8)">
            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4" />
          </svg>
          <span className="xp-modal-title">
            {currentCustomer.name}
            {currentCustomer.code && <span className="xp-modal-code">[{currentCustomer.code}]</span>}
          </span>
          <button className="xp-btn xp-btn-wa xp-btn-sm" onClick={sendWhatsAppHistory}>
            📱 Statement
          </button>
          <button className="xp-cap-btn xp-cap-close" onClick={onClose}>✕</button>
        </div>

        {/* Customer Info Strip */}
        <div className="cc-info-strip">
          <div className="cc-info-meta">
            {currentCustomer.phone && <span className="cc-info-chip">📞 {currentCustomer.phone}</span>}
            {currentCustomer.address && <span className="cc-info-chip">📍 {currentCustomer.address}</span>}
            {currentCustomer.area && <span className="cc-info-chip">🏘️ {currentCustomer.area}</span>}
          </div>

          {/* Statistics Cards */}
          <div className="cc-stat-row">
            <div className="cc-mini-stat">
              <div className="cc-mini-lbl">Total Purchases</div>
              <div className="cc-mini-val">PKR {fmt(totalSales)}</div>
            </div>
            <div className="cc-mini-stat">
              <div className="cc-mini-lbl">Total Paid</div>
              <div className="cc-mini-val success">PKR {fmt(totalPaid)}</div>
            </div>
            <div className="cc-mini-stat">
              <div className="cc-mini-lbl">Returns</div>
              <div className="cc-mini-val warning">PKR {fmt(totalReturn)}</div>
            </div>
            <div className="cc-mini-stat danger">
              <div className="cc-mini-lbl">Outstanding</div>
              <div className="cc-mini-val danger">PKR {fmt(outstanding)}</div>
            </div>
            <div className="cc-mini-stat">
              <div className="cc-mini-lbl">Transactions</div>
              <div className="cc-mini-val">{sales.length}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="xp-tab-bar">
          <button className={`xp-tab${activeTab === "history" ? " active" : ""}`} onClick={() => setActiveTab("history")}>
            📋 History
            <span className="xp-tab-cnt">{sales.length}</span>
          </button>
          <button className={`xp-tab${activeTab === "pay" ? " active" : ""}`} onClick={() => { setActiveTab("pay"); setTimeout(() => payRef.current?.focus(), 50); }}>
            💰 Record Payment
          </button>
        </div>

        {/* Modal Body */}
        <div className="xp-modal-body">
          {/* History Tab */}
          {activeTab === "history" && (
            <>
              {loadingSales && <div className="xp-loading">Loading transactions…</div>}
              {!loadingSales && sales.length === 0 && <div className="xp-empty">No transactions found</div>}
              {!loadingSales && sales.length > 0 && (
                <div className="xp-table-panel">
                  <div className="xp-table-scroll">
                    <table className="xp-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th style={{ width: 35 }}>#</th>
                          <th>Invoice</th>
                          <th>Date</th>
                          <th className="r">Net Total</th>
                          <th className="r">Paid</th>
                          <th className="r">Balance</th>
                          <th>Type</th>
                          <th style={{ width: 30 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {sales.map((s, i) => (
                          <>
                            <tr key={s._id} className={selectedSale?._id === s._id ? "cc-row-expanded" : ""} style={{ cursor: "pointer" }} onClick={() => setSelectedSale(selectedSale?._id === s._id ? null : s)}>
                              <td className="text-muted">{i + 1}</td>
                              <td><strong>{s.invoiceNo}</strong></td>
                              <td className="text-muted">{s.invoiceDate}</td>
                              <td className="r xp-amt">{fmt(s.netTotal)}</td>
                              <td className="r xp-amt success">{fmt(s.paidAmount)}</td>
                              <td className="r">{s.balance > 0 ? <span className="xp-amt danger">{fmt(s.balance)}</span> : <span className="text-muted">✓</span>}</td>
                              <td><span className={`xp-badge ${s.saleType === "return" ? "xp-badge-ret" : "xp-badge-sale"}`}>{s.saleType === "return" ? "Return" : "Sale"}</span></td>
                              <td style={{ textAlign: "center" }}>{selectedSale?._id === s._id ? "▲" : "▼"}</td>
                            </tr>

                            {selectedSale?._id === s._id && (
                              <tr>
                                <td colSpan={8} className="cc-detail-cell">
                                  <div className="cc-detail-inner">
                                    <table className="xp-table" style={{ fontSize: 11 }}>
                                      <thead>
                                        <tr><th>#</th><th>Description</th><th>Meas.</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr>
                                      </thead>
                                      <tbody>
                                        {(s.items || []).map((it, j) => (
                                          <tr key={j}>
                                            <td className="text-muted">{j + 1}</td>
                                            <td>{it.description}</td>
                                            <td className="text-muted">{it.measurement || "—"}</td>
                                            <td className="r">{it.qty}</td>
                                            <td className="r xp-amt">{fmt(it.rate)}</td>
                                            <td className="r xp-amt">{fmt(it.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div className="cc-detail-footer">
                                    <span>Net: <strong>PKR {fmt(s.netTotal)}</strong></span>
                                    <span>Paid: <strong>PKR {fmt(s.paidAmount)}</strong></span>
                                    {s.balance > 0 && <span className="danger">Balance: <strong>PKR {fmt(s.balance)}</strong></span>}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Payment Tab */}
          {activeTab === "pay" && (
            <div className="cc-pay-form">
              <div className="cc-due-banner">
                <span>💰 Outstanding Balance</span>
                <strong>PKR {fmt(outstanding)}</strong>
              </div>

              {payMsg.text && (
                <div className={`xp-alert ${payMsg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ marginBottom: 12 }}>
                  {payMsg.text}
                </div>
              )}

              <div className="cc-pay-form-row">
                <div className="xp-form-grp">
                  <label className="xp-label">Amount (PKR)</label>
                  <div className="cc-pfx-wrap">
                    <span className="cc-pfx">PKR</span>
                    <input ref={payRef} type="number" className="xp-input xp-input-lg" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePay()} placeholder="0" />
                  </div>
                </div>
                <div className="xp-form-grp">
                  <label className="xp-label">Remarks</label>
                  <input type="text" className="xp-input xp-input-lg" value={payRemarks} onChange={(e) => setPayRemarks(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handlePay()} placeholder="Cash, Cheque, Bank Transfer..." />
                </div>
              </div>

              <button className="xp-btn xp-btn-success xp-btn-lg" onClick={handlePay} disabled={paying} style={{ width: "100%" }}>
                {paying ? "Processing..." : "💵 Record Payment"}
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="xp-modal-footer">
          <button className="xp-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE - Credit Customers List
════════════════════════════════════════════════════════════ */
export default function CreditCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("balance");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const searchRef = useRef(null);

  // Load customers on mount
  useEffect(() => {
    loadCustomers();
    searchRef.current?.focus();
  }, []);

  // Fetch customers from API
  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL + "?type=credit&limit=500");
      if (data.success) {
        setCustomers(data.data || []);
      }
    } catch (err) {
      showMsg("Failed to load customers", "error");
    }
    setLoading(false);
  };

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  // Statistics
  const totalCustomers = customers.length;
  const dueCustomers = customers.filter((c) => (c.currentBalance || 0) > 0);
  const clearCustomers = customers.filter((c) => (c.currentBalance || 0) <= 0);
  const totalDue = customers.reduce((s, c) => s + Math.max(0, c.currentBalance || 0), 0);
  const totalRecovered = customers.reduce((s, c) => s + Math.max(0, -(c.currentBalance || 0)), 0);

  // Filter and sort customers
  const filtered = customers
    .filter((c) => {
      const query = search.toLowerCase();
      const matchSearch = !query || 
        c.name?.toLowerCase().includes(query) ||
        c.phone?.includes(query) ||
        c.code?.toLowerCase().includes(query) ||
        c.area?.toLowerCase().includes(query);
      
      const matchType = filterType === "all" ||
        (filterType === "due" && (c.currentBalance || 0) > 0) ||
        (filterType === "clear" && (c.currentBalance || 0) <= 0);
      
      return matchSearch && matchType;
    })
    .sort((a, b) => {
      if (sortBy === "balance") return (b.currentBalance || 0) - (a.currentBalance || 0);
      return a.name.localeCompare(b.name);
    });

  // Send bulk reminder via WhatsApp
  const sendBulkReminder = () => {
    const dueList = filtered.filter((c) => (c.currentBalance || 0) > 0).slice(0, 20);
    if (!dueList.length) {
      showMsg("No customers with due balance", "error");
      return;
    }
    
    const lines = dueList.map((c, i) => `${i + 1}. ${c.name}${c.phone ? " - " + c.phone : ""} - PKR ${fmt(c.currentBalance)}`).join("\n");
    const message = `*ASIM ELECTRIC & ELECTRONIC STORE*\n*OUTSTANDING DUE CUSTOMERS*\n📅 Date: ${isoD()}\n${"─".repeat(30)}\n${lines}\n${"─".repeat(30)}\n💰 *Total Outstanding: PKR ${fmt(totalDue)}*`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f1f5f9" }}>
      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdated={() => loadCustomers()}
        />
      )}

      {/* Page Header */}
      <div className="xp-titlebar">
        <button className="xp-cap-btn" onClick={() => navigate("/")} title="Back" style={{ marginRight: 2 }}>
          ←
        </button>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
          <path d="M15 14s1 0 1-1-1-4-5-4-5 3-5 4 1 1 1 1zm-7.978-1A.261.261 0 0 1 7 12.996c.001-.264.167-1.03.76-1.72C8.312 10.629 9.282 10 11 10c1.717 0 2.687.63 3.24 1.276.593.69.758 1.457.76 1.72l-.008.002A.274.274 0 0 1 15 13zM11 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4m3-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0M6.936 9.28a6 6 0 0 0-1.23-.247A7 7 0 0 0 5 9c-4 0-5 3-5 4q0 1 1 1h4.216A2.24 2.24 0 0 1 5 13c0-1.01.377-2.042 1.09-2.904.243-.294.526-.569.846-.816M4.92 10A5.5 5.5 0 0 0 4 13H1c0-.26.164-1.03.76-1.724.545-.636 1.492-1.256 3.16-1.275ZM1.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0m3-2a2 2 0 1 0 0 4 2 2 0 0 0 0-4" />
        </svg>
        <span className="xp-tb-title">Credit Customers — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={sendBulkReminder}>
            📱 Bulk Reminder
          </button>
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={() => navigate("/customers")}>
            + Add Customer
          </button>
          <div className="xp-tb-divider" />
          <button className="xp-cap-btn" title="Minimize">─</button>
          <button className="xp-cap-btn" title="Maximize">□</button>
          <button className="xp-cap-btn xp-cap-close" title="Close">✕</button>
        </div>
      </div>

      {/* Alert Message */}
      {msg.text && (
        <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "8px 16px 0" }}>
          {msg.text}
        </div>
      )}

      <div className="xp-page-body" style={{ padding: "16px" }}>
        {/* Statistics Cards */}
        <div className="cc-stat-grid">
          <div className="cc-stat-card">
            <div className="cc-stat-label">Total Customers</div>
            <div className="cc-stat-val">{totalCustomers}</div>
          </div>
          <div className="cc-stat-card red">
            <div className="cc-stat-label">With Due</div>
            <div className="cc-stat-val danger">{dueCustomers.length}</div>
          </div>
          <div className="cc-stat-card green">
            <div className="cc-stat-label">Clear / Paid</div>
            <div className="cc-stat-val success">{clearCustomers.length}</div>
          </div>
          <div className="cc-stat-card red">
            <div className="cc-stat-label">Total Outstanding</div>
            <div className="cc-stat-val danger">PKR {fmt(totalDue)}</div>
          </div>
          <div className="cc-stat-card green">
            <div className="cc-stat-label">Recovered</div>
            <div className="cc-stat-val success">PKR {fmt(totalRecovered)}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="xp-toolbar" style={{ marginTop: 12 }}>
          <div className="xp-search-wrap" style={{ flex: 1 }}>
            <svg className="xp-search-icon" width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0" />
            </svg>
            <input ref={searchRef} type="text" className="xp-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, code or area..." />
          </div>

          <div className="xp-filter-group">
            <button className={`xp-filter-btn${filterType === "all" ? " active" : ""}`} onClick={() => setFilterType("all")}>All ({totalCustomers})</button>
            <button className={`xp-filter-btn${filterType === "due" ? " active" : ""}`} onClick={() => setFilterType("due")}>Due ({dueCustomers.length})</button>
            <button className={`xp-filter-btn${filterType === "clear" ? " active" : ""}`} onClick={() => setFilterType("clear")}>Clear ({clearCustomers.length})</button>
          </div>

          <select className="xp-select" style={{ width: "auto" }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="name">Sort: Name</option>
            <option value="balance">Sort: Balance (High to Low)</option>
          </select>

          <span className="text-muted" style={{ fontSize: 12 }}>{filtered.length} records</span>
        </div>

        {/* Customer Table */}
        <div className="xp-table-panel" style={{ marginTop: 12 }}>
          {loading && <div className="xp-loading">Loading customers...</div>}
          {!loading && filtered.length === 0 && <div className="xp-empty">No customers found</div>}
          {!loading && filtered.length > 0 && (
            <div className="xp-table-scroll">
              <table className="xp-table" style={{ fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>#</th>
                    <th>Code</th>
                    <th>Customer Name</th>
                    <th>Phone</th>
                    <th>Area</th>
                    <th className="r">Outstanding (PKR)</th>
                    <th>Status</th>
                    <th style={{ width: 80 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c._id} className={(c.currentBalance || 0) > 0 ? "cc-row-due" : ""}>
                      <td className="text-muted">{i + 1}</td>
                      <td><span className="xp-code">{c.code || "—"}</span></td>
                      <td><button className="xp-link-btn" onClick={() => setSelectedCustomer(c)}>{c.name}</button></td>
                      <td className="text-muted">{c.phone || "—"}</td>
                      <td className="text-muted">{c.area || "—"}</td>
                      <td className="r"><span className={`xp-amt${(c.currentBalance || 0) > 0 ? " danger" : ""}`}>{fmt(c.currentBalance || 0)}</span></td>
                      <td><span className={`xp-badge ${(c.currentBalance || 0) > 0 ? "xp-badge-due" : "xp-badge-clear"}`}>{(c.currentBalance || 0) > 0 ? "Due" : "Clear"}</span></td>
                      <td>
                        <div className="cc-act">
                          <button className="xp-btn xp-btn-sm xp-btn-ico" title="View Details" onClick={() => setSelectedCustomer(c)}>👁️</button>
                          {c.phone && (
                            <button className="xp-btn xp-btn-sm xp-btn-ico cc-btn-wa-sm" title="WhatsApp" onClick={() => {
                              const message = `Assalam-o-Alaikum *${c.name}*,\n\nYour outstanding balance: *PKR ${fmt(c.currentBalance)}*\nPlease clear at your earliest convenience.\n\n_Asim Electric Store_`;
                              window.open(`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`, "_blank");
                            }}>📱</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}><strong>Total</strong></td>
                    <td className="r xp-amt danger"><strong>PKR {fmt(filtered.reduce((s, c) => s + Math.max(0, c.currentBalance || 0), 0))}</strong></td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar">
        <div className="xp-status-pane">👥 {totalCustomers} customers</div>
        <div className="xp-status-pane">⚠️ {dueCustomers.length} due</div>
        <div className="xp-status-pane">💰 Outstanding: PKR {fmt(totalDue)}</div>
      </div>
    </div>
  );
}
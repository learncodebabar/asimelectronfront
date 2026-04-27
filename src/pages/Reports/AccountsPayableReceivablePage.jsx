// pages/AccountsPayableReceivablePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function AccountsPayableReceivablePage() {
  const navigate = useNavigate();
  
  // State for active tab (Payable or Receivable)
  const [activeTab, setActiveTab] = useState("payable");
  
  // State for suppliers (Payable)
  const [suppliers, setSuppliers] = useState([]);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  
  // State for customers (Receivable)
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Summary data
  const [summary, setSummary] = useState({
    totalPayable: 0,
    totalReceivable: 0,
    dueSuppliers: 0,
    dueCustomers: 0
  });
  
  const searchRef = useRef(null);
  
  useEffect(() => {
    loadSuppliers();
    loadCustomers();
    searchRef.current?.focus();
  }, []);
  
  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        // Filter suppliers (type = supplier)
        const suppliersList = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type === "supplier";
        });
        setSuppliers(suppliersList);
        
        // Calculate total payable
        const total = suppliersList.reduce((sum, s) => sum + Math.max(0, s.currentBalance || 0), 0);
        const dueCount = suppliersList.filter(s => (s.currentBalance || 0) > 0).length;
        setSummary(prev => ({ ...prev, totalPayable: total, dueSuppliers: dueCount }));
      }
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    }
    setLoadingSuppliers(false);
  };
  
  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL + "?type=credit");
      if (data.success) {
        // Filter credit customers (not suppliers)
        const customersList = data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type !== "supplier";
        });
        setCustomers(customersList);
        
        // Calculate total receivable
        const total = customersList.reduce((sum, c) => sum + Math.max(0, c.currentBalance || 0), 0);
        const dueCount = customersList.filter(c => (c.currentBalance || 0) > 0).length;
        setSummary(prev => ({ ...prev, totalReceivable: total, dueCustomers: dueCount }));
      }
    } catch (err) {
      console.error("Failed to load customers:", err);
    }
    setLoadingCustomers(false);
  };
  
  const filteredSuppliers = suppliers.filter(s => {
    const query = supplierSearch.toLowerCase();
    return !query || 
      s.name?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.code?.toLowerCase().includes(query) ||
      s.area?.toLowerCase().includes(query);
  });
  
  const filteredCustomers = customers.filter(c => {
    const query = customerSearch.toLowerCase();
    return !query || 
      c.name?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.code?.toLowerCase().includes(query) ||
      c.area?.toLowerCase().includes(query);
  });
  
  const handleViewDetails = (entity, type) => {
    // Navigate to detail page or open modal
    if (type === "supplier") {
      // Navigate to supplier details
      showMsg(`Viewing ${entity.name} details`, "success");
    } else {
      // Navigate to customer details
      showMsg(`Viewing ${entity.name} details`, "success");
    }
  };
  
  const showMsg = (text, type = "success") => {
    // For now, just console log
    console.log(text);
  };
  
  const totalPayable = filteredSuppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance || 0), 0);
  const totalReceivable = filteredCustomers.reduce((sum, c) => sum + Math.max(0, c.currentBalance || 0), 0);
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Accounts Payable / Receivable — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={() => { if (activeTab === "payable") loadSuppliers(); else loadCustomers(); }} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button className="xp-cap-btn xp-cap-close" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      {/* Summary Cards */}
      <div className="sl-page-body" style={{ padding: "12px 16px", background: "#ffffff" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "4px" }}>Total Payable</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(summary.totalPayable)}</div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{summary.dueSuppliers} suppliers with due</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "4px" }}>Total Receivable</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(summary.totalReceivable)}</div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{summary.dueCustomers} customers with due</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "4px" }}>Net Position</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: summary.totalReceivable - summary.totalPayable >= 0 ? "#059669" : "#dc2626" }}>
              PKR {fmt(Math.abs(summary.totalReceivable - summary.totalPayable))}
            </div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>
              {summary.totalReceivable - summary.totalPayable >= 0 ? "Receivable (Asset)" : "Payable (Liability)"}
            </div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px 16px" }}>
            <div style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "4px" }}>Total Entities</div>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#000000" }}>{suppliers.length + customers.length}</div>
            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "4px" }}>{suppliers.length} suppliers, {customers.length} customers</div>
          </div>
        </div>
        
        {/* Tabs */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "2px solid #000000" }}>
          <button
            onClick={() => setActiveTab("payable")}
            style={{
              padding: "8px 24px",
              background: activeTab === "payable" ? "#1e40af" : "transparent",
              color: activeTab === "payable" ? "#ffffff" : "#1e293b",
              border: "none",
              borderBottom: activeTab === "payable" ? "none" : "2px solid transparent",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0"
            }}
          >
            🏢 Accounts Payable (Suppliers)
          </button>
          <button
            onClick={() => setActiveTab("receivable")}
            style={{
              padding: "8px 24px",
              background: activeTab === "receivable" ? "#1e40af" : "transparent",
              color: activeTab === "receivable" ? "#ffffff" : "#1e293b",
              border: "none",
              borderBottom: activeTab === "receivable" ? "none" : "2px solid transparent",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              borderRadius: "6px 6px 0 0"
            }}
          >
            👥 Accounts Receivable (Customers)
          </button>
        </div>
        
        {/* Search Bar */}
        <div className="xp-toolbar" style={{ marginBottom: "16px" }}>
          <div className="xp-search-wrap" style={{ width: "100%" }}>
            <svg className="xp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666" }}>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
            <input 
              ref={searchRef} 
              type="text" 
              className="xp-input" 
              style={{ 
                paddingLeft: "32px", 
                border: "2px solid #000000", 
                borderRadius: "6px", 
                height: "38px", 
                width: "100%", 
                fontSize: "13px",
                background: "#ffffff"
              }} 
              value={activeTab === "payable" ? supplierSearch : customerSearch}
              onChange={(e) => activeTab === "payable" ? setSupplierSearch(e.target.value) : setCustomerSearch(e.target.value)} 
              placeholder={activeTab === "payable" ? "Search by supplier name, code, phone or area..." : "Search by customer name, code, phone or area..."}
              autoFocus 
            />
          </div>
        </div>
        
        {/* Payable Table (Suppliers) */}
        {activeTab === "payable" && (
          <div className="xp-table-panel" style={{ border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
            {loadingSuppliers && <div className="xp-loading" style={{ padding: "40px", textAlign: "center" }}>Loading suppliers...</div>}
            {!loadingSuppliers && filteredSuppliers.length === 0 && (
              <div className="xp-empty" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No suppliers found</div>
            )}
            {!loadingSuppliers && filteredSuppliers.length > 0 && (
              <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
                <table className="xp-table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse", border: "2px solid #000000" }}>
                  <thead>
                    <tr style={{ background: "#000000", color: "#ffffff" }}>
                      <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Code</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Supplier Name</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Phone</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Area</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Payable Amount</th>
                      <th style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Status</th>
                      <th style={{ width: 80, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSuppliers.map((s, i) => (
                      <tr key={s._id} style={{ borderBottom: "1px solid #000000", background: (s.currentBalance || 0) > 0 ? "#fef2f2" : "#ffffff" }}>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", color: "#666" }}>{i + 1}</td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", background: "#f5f5f5" }}>{s.code || "—"}</td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000" }}>
                          <button onClick={() => handleViewDetails(s, "supplier")} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
                            {s.name}
                          </button>
                        </td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{s.phone || "—"}</td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{s.area || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>
                          PKR {fmt(s.currentBalance || 0)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                          <span style={{ background: (s.currentBalance || 0) > 0 ? "#fee2e2" : "#d1fae5", color: (s.currentBalance || 0) > 0 ? "#dc2626" : "#059669", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000" }}>
                            {(s.currentBalance || 0) > 0 ? "Payable" : "Cleared"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button className="xp-btn xp-btn-sm" onClick={() => handleViewDetails(s, "supplier")} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="View Details">📋</button>
                            {s.phone && (
                              <button className="xp-btn xp-btn-sm" onClick={(e) => { 
                                e.stopPropagation(); 
                                const msg = `Assalam-o-Alaikum *${s.name}*,\n\nPayable Amount: *PKR ${fmt(s.currentBalance)}*`;
                                window.open(`https://wa.me/${s.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                              }} style={{ background: "#25D366", color: "#ffffff", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="WhatsApp">📱</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #000000" }}>
                    <tr>
                      <td colSpan="5" style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>Total Payable:</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(totalPayable)}</td>
                      <td colSpan="2" style={{ padding: "10px 8px", border: "1px solid #000000" }}> </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Receivable Table (Customers) */}
        {activeTab === "receivable" && (
          <div className="xp-table-panel" style={{ border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
            {loadingCustomers && <div className="xp-loading" style={{ padding: "40px", textAlign: "center" }}>Loading customers...</div>}
            {!loadingCustomers && filteredCustomers.length === 0 && (
              <div className="xp-empty" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No customers found</div>
            )}
            {!loadingCustomers && filteredCustomers.length > 0 && (
              <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
                <table className="xp-table" style={{ fontSize: "13px", width: "100%", borderCollapse: "collapse", border: "2px solid #000000" }}>
                  <thead>
                    <tr style={{ background: "#000000", color: "#ffffff" }}>
                      <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Code</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Customer Name</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Phone</th>
                      <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Area</th>
                      <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Receivable Amount</th>
                      <th style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Status</th>
                      <th style={{ width: 80, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((c, i) => (
                      <tr key={c._id} style={{ borderBottom: "1px solid #000000", background: (c.currentBalance || 0) > 0 ? "#fef2f2" : "#ffffff" }}>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", color: "#666" }}>{i + 1}</td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", background: "#f5f5f5" }}>{c.code || "—"}</td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000" }}>
                          <button onClick={() => handleViewDetails(c, "customer")} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
                            {c.name}
                          </button>
                        </td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{c.phone || "—"}</td>
                        <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{c.area || "—"}</td>
                        <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>
                          PKR {fmt(c.currentBalance || 0)}
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                          <span style={{ background: (c.currentBalance || 0) > 0 ? "#fee2e2" : "#d1fae5", color: (c.currentBalance || 0) > 0 ? "#dc2626" : "#059669", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000" }}>
                            {(c.currentBalance || 0) > 0 ? "Receivable" : "Cleared"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button className="xp-btn xp-btn-sm" onClick={() => handleViewDetails(c, "customer")} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="View Details">📋</button>
                            {c.phone && (
                              <button className="xp-btn xp-btn-sm" onClick={(e) => { 
                                e.stopPropagation(); 
                                const msg = `Assalam-o-Alaikum *${c.name}*,\n\nOutstanding: *PKR ${fmt(c.currentBalance)}*`;
                                window.open(`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                              }} style={{ background: "#25D366", color: "#ffffff", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="WhatsApp">📱</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: "#f5f5f5", fontWeight: "bold", borderTop: "2px solid #000000" }}>
                    <tr>
                      <td colSpan="5" style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>Total Receivable:</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(totalReceivable)}</td>
                      <td colSpan="2" style={{ padding: "10px 8px", border: "1px solid #000000" }}> </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e293b" }}>📊 Accounts Payable / Receivable</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e293b" }}>
          {activeTab === "payable" ? `${filteredSuppliers.length} suppliers, Payable: PKR ${fmt(totalPayable)}` : `${filteredCustomers.length} customers, Receivable: PKR ${fmt(totalReceivable)}`}
        </div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#1e293b" }}>Net: PKR {fmt(Math.abs(totalReceivable - totalPayable))}</div>
      </div>
    </div>
  );
}
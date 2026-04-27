// pages/Reports/ReceivablesPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

export default function ReceivablesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [areas, setAreas] = useState([]);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL);
      if (data.success) {
        // Process customers to calculate their receivable amounts
        const processedCustomers = data.data.map(customer => {
          const sales = customer.sales || [];
          const totalInvoices = sales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
          const totalPaid = sales.reduce((sum, s) => sum + (s.paidAmount || 0), 0);
          const outstanding = totalInvoices - totalPaid;
          
          return {
            ...customer,
            totalInvoices,
            totalPaid,
            outstanding
          };
        }).filter(c => c.outstanding > 0); // Only show customers with outstanding balance
        
        setCustomers(processedCustomers);
        
        // Extract unique areas for filter
        const uniqueAreas = [...new Set(processedCustomers.map(c => c.area).filter(Boolean))];
        setAreas(uniqueAreas);
      }
    } catch (error) {
      console.error("Failed to load customers:", error);
    }
    setLoading(false);
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = !search || 
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.code?.toLowerCase().includes(search.toLowerCase());
    const matchesArea = !filterArea || c.area === filterArea;
    return matchesSearch && matchesArea;
  });

  const totalInvoicesAmount = filteredCustomers.reduce((sum, c) => sum + (c.totalInvoices || 0), 0);
  const totalPaidAmount = filteredCustomers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
  const totalOutstanding = filteredCustomers.reduce((sum, c) => sum + (c.outstanding || 0), 0);

  const handleCustomerClick = (customer) => {
    navigate(`/customers/${customer._id}`);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px", background: "none", border: "none", cursor: "pointer" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Receivables Report — Asim Electric Store</span>
      </div>

      <div className="xp-page-body" style={{ padding: "16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Customers</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>{filteredCustomers.length}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Invoices</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>PKR {fmt(totalInvoicesAmount)}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Outstanding</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#dc2626" }}>PKR {fmt(totalOutstanding)}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="xp-toolbar" style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="xp-search-wrap" style={{ flex: 2, position: "relative" }}>
            <svg className="xp-search-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#666" }}>
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>
            </svg>
            <input 
              type="text" 
              className="xp-input" 
              style={{ paddingLeft: "32px", border: "2px solid #000000", borderRadius: "6px", height: "38px", width: "100%", fontSize: "13px" }} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by name, phone, or code..." 
            />
          </div>
          <select 
            className="xp-input" 
            style={{ width: "150px", border: "2px solid #000000", borderRadius: "6px", height: "38px", fontSize: "13px" }}
            value={filterArea} 
            onChange={(e) => setFilterArea(e.target.value)}
          >
            <option value="">All Areas</option>
            {areas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
          <button className="xp-btn xp-btn-sm" onClick={loadCustomers} style={{ border: "2px solid #000000", fontWeight: "bold", padding: "6px 12px" }}>⟳ Refresh</button>
          <span className="text-muted" style={{ fontSize: "12px", fontWeight: "bold", color: "#000000" }}>{filteredCustomers.length} customers</span>
        </div>

        {/* Customers Table */}
        <div className="xp-table-panel" style={{ border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>Loading customers...</div>}
          
          {!loading && filteredCustomers.length === 0 && (
            <div className="xp-empty" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>No customers found</div>
          )}
          
          {!loading && filteredCustomers.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "13px", cursor: "pointer", width: "100%", borderCollapse: "collapse", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#ffffff" }}>
                    <th style={{ width: 40, padding: "12px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Code</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Customer Name</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Phone</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Area</th>
                    <th style={{ padding: "12px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Total Invoices</th>
                    <th style={{ padding: "12px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Total Paid</th>
                    <th style={{ padding: "12px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Outstanding</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((c, i) => (
                    <tr key={c._id} style={{ borderBottom: "1px solid #000000", background: (c.outstanding > 0) ? "#fff5f5" : "#ffffff" }}>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", color: "#666" }}>{i + 1}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", background: "#f5f5f5" }}>{c.code || "—"}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000" }}>
                        <button className="xp-link-btn" onClick={() => handleCustomerClick(c)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
                          <strong>{c.name}</strong>
                        </button>
                      </td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{c.phone || "—"}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{c.area || "—"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(c.totalInvoices)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#059669" }}>PKR {fmt(c.totalPaid)}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: c.outstanding > 0 ? "#dc2626" : "#059669" }}>
                        PKR {fmt(c.outstanding)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button className="xp-btn xp-btn-sm" onClick={() => handleCustomerClick(c)} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="Full Details">📋</button>
                          {c.phone && (
                            <button className="xp-btn xp-btn-sm" onClick={(e) => { 
                              e.stopPropagation(); 
                              const msg = `Assalam-o-Alaikum *${c.name}*,\n\nOutstanding: *PKR ${fmt(c.outstanding)}*`;
                              window.open(`https://wa.me/${c.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                            }} style={{ background: "#25D366", color: "#ffffff", border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="WhatsApp">📱</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #000000" }}>
                  <tr>
                    <td colSpan="5" style={{ padding: "8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>TOTALS:</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", border: "1px solid #000000" }}>PKR {fmt(totalInvoicesAmount)}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#059669", border: "1px solid #000000" }}>PKR {fmt(totalPaidAmount)}</td>
                    <td style={{ padding: "8px", textAlign: "right", fontWeight: "bold", color: "#dc2626", border: "1px solid #000000" }}>PKR {fmt(totalOutstanding)}</td>
                    <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000" }}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "4px 12px" }}>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "10px", fontWeight: "500" }}>📊 Receivables Report</div>
        <div className="xp-status-pane" style={{ color: "#1e293b", fontSize: "10px", fontWeight: "500" }}>Total Due: PKR {fmt(totalOutstanding)}</div>
      </div>
    </div>
  );
}
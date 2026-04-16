// pages/PurchaseReturnListPage.jsx
import { useState, useEffect } from "react";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/SalePage.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");

export default function PurchaseReturnListPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      const response = await api.get(EP.PURCHASES.GET_ALL);
      if (response.data.success && response.data.data) {
        const purchaseReturns = response.data.data.filter(r => r.type === "purchase_return");
        setReturns(purchaseReturns);
      }
    } catch (error) {
      console.error("Failed to fetch purchase returns:", error);
    }
    setLoading(false);
  };

  const filteredReturns = returns.filter(r => 
    r.returnNo?.toLowerCase().includes(search.toLowerCase()) ||
    r.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
    r.invoiceNo?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="sl-page">
      <div className="xp-titlebar" style={{ background: "#dc2626" }}>
        <span className="xp-tb-title">Purchase Return List</span>
      </div>
      
      <div style={{ padding: "16px" }}>
        <div style={{ marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="text"
            className="xp-input"
            placeholder="Search by Return #, Invoice #, or Supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "300px", borderColor: "#dc2626" }}
          />
          <button className="xp-btn xp-btn-sm" onClick={fetchReturns} style={{ borderColor: "#dc2626" }}>Refresh</button>
        </div>
        
        <div className="xp-table-panel">
          <div className="xp-table-scroll">
            <table className="xp-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Return #</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Ref Purchase Inv</th>
                  <th className="r">Items</th>
                  <th className="r">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} className="xp-empty">Loading...</td></tr>
                )}
                {!loading && filteredReturns.length === 0 && (
                  <tr><td colSpan={7} className="xp-empty">No purchase returns found</td></tr>
                )}
                {filteredReturns.map((r, i) => (
                  <tr key={r._id}>
                    <td className="text-muted">{i + 1}</td>
                    <td><span className="xp-code">{r.returnNo || r.invoiceNo}</span></td>
                    <td>{r.returnDate || r.invoiceDate?.split("T")[0]}</td>
                    <td>{r.supplierName}</td>
                    <td>{r.purchaseInvNo || "-"}</td>
                    <td className="r">{r.items?.length || 0}</td>
                    <td className="r xp-amt" style={{ color: "#dc2626" }}>{fmt(r.netTotal || r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      <style>{`
        .xp-table th {
          background: #dc2626 !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
}
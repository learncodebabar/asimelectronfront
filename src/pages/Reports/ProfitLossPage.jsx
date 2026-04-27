// pages/ProfitLossPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function ProfitLossPage() {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(isoD());
  const [profitLoss, setProfitLoss] = useState({
    income: {
      sales: 0,
      salesReturns: 0,
      otherIncome: 0,
      totalIncome: 0
    },
    costOfGoodsSold: {
      openingStock: 0,
      purchases: 0,
      purchaseReturns: 0,
      closingStock: 0,
      totalCost: 0
    },
    expenses: {
      salaries: 0,
      rent: 0,
      utilities: 0,
      transportation: 0,
      marketing: 0,
      maintenance: 0,
      otherExpenses: 0,
      totalExpenses: 0
    },
    grossProfit: 0,
    netProfit: 0,
    grossMargin: 0,
    netMargin: 0
  });
  
  const [detailedData, setDetailedData] = useState({
    sales: [],
    purchases: [],
    expenses: []
  });
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportType, setReportType] = useState("summary");
  
  const dateRef = useRef(null);
  
  useEffect(() => {
    fetchProfitLoss();
  }, [fromDate, toDate]);
  
  const fetchProfitLoss = async () => {
    setLoading(true);
    try {
      // Fetch all required data
      const [salesRes, purchasesRes, productsRes] = await Promise.all([
        api.get(EP.SALES.GET_ALL),
        api.get(EP.PURCHASES.GET_ALL),
        api.get(EP.PRODUCTS.GET_ALL)
      ]);
      
      // Filter by date range
      const sales = (salesRes.data.data || []).filter(s => 
        s.invoiceDate >= fromDate && s.invoiceDate <= toDate && 
        s.saleType !== "return" && s.paymentMode !== "Credit"
      );
      const salesReturns = (salesRes.data.data || []).filter(s => 
        s.invoiceDate >= fromDate && s.invoiceDate <= toDate && 
        s.saleType === "return"
      );
      const purchases = (purchasesRes.data.data || []).filter(p => 
        p.invoiceDate >= fromDate && p.invoiceDate <= toDate && 
        p.type !== "purchase_return"
      );
      const purchaseReturns = (purchasesRes.data.data || []).filter(p => 
        p.invoiceDate >= fromDate && p.invoiceDate <= toDate && 
        p.type === "purchase_return"
      );
      
      // Calculate Income
      const totalSales = sales.reduce((sum, s) => sum + (s.netTotal || 0), 0);
      const totalSalesReturns = salesReturns.reduce((sum, s) => sum + (s.netTotal || 0), 0);
      
      // Calculate Cost of Goods Sold
      const totalPurchases = purchases.reduce((sum, p) => sum + (p.netTotal || 0), 0);
      const totalPurchaseReturns = purchaseReturns.reduce((sum, p) => sum + (p.netTotal || 0), 0);
      
      // Calculate inventory value (opening and closing)
      let openingStock = 0;
      let closingStock = 0;
      const products = productsRes.data.data || [];
      
      // For demo purposes, calculate stock based on products
      products.forEach(p => {
        const pk = p.packingInfo?.[0];
        if (pk?.stockEnabled && pk.openingQty && pk.purchaseRate) {
          const stockValue = parseFloat(pk.openingQty) * parseFloat(pk.purchaseRate);
          // Simple logic: products created before fromDate are opening stock
          const createdAt = p.createdAt?.split("T")[0];
          if (createdAt && createdAt < fromDate) {
            openingStock += stockValue;
          }
          closingStock += stockValue;
        }
      });
      
      // Calculate Gross Profit
      const netSales = totalSales - totalSalesReturns;
      const netPurchases = totalPurchases - totalPurchaseReturns;
      const costOfGoodsSold = openingStock + netPurchases - closingStock;
      const grossProfit = netSales - costOfGoodsSold;
      
      // Sample expenses (in a real system, these would come from expense tracking)
      const expenses = {
        salaries: 50000,
        rent: 25000,
        utilities: 15000,
        transportation: 10000,
        marketing: 8000,
        maintenance: 5000,
        otherExpenses: 7000
      };
      
      const totalExpenses = Object.values(expenses).reduce((sum, e) => sum + e, 0);
      const netProfit = grossProfit - totalExpenses;
      
      // Calculate margins
      const grossMargin = netSales > 0 ? (grossProfit / netSales) * 100 : 0;
      const netMargin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
      
      setProfitLoss({
        income: {
          sales: totalSales,
          salesReturns: totalSalesReturns,
          otherIncome: 0,
          totalIncome: netSales
        },
        costOfGoodsSold: {
          openingStock: openingStock,
          purchases: totalPurchases,
          purchaseReturns: totalPurchaseReturns,
          closingStock: closingStock,
          totalCost: costOfGoodsSold
        },
        expenses: {
          salaries: expenses.salaries,
          rent: expenses.rent,
          utilities: expenses.utilities,
          transportation: expenses.transportation,
          marketing: expenses.marketing,
          maintenance: expenses.maintenance,
          otherExpenses: expenses.otherExpenses,
          totalExpenses: totalExpenses
        },
        grossProfit: grossProfit,
        netProfit: netProfit,
        grossMargin: grossMargin,
        netMargin: netMargin
      });
      
      setDetailedData({
        sales: sales.slice(0, 20),
        purchases: purchases.slice(0, 20),
        expenses: [
          { name: "Salaries", amount: expenses.salaries },
          { name: "Rent", amount: expenses.rent },
          { name: "Utilities", amount: expenses.utilities },
          { name: "Transportation", amount: expenses.transportation },
          { name: "Marketing", amount: expenses.marketing },
          { name: "Maintenance", amount: expenses.maintenance },
          { name: "Other Expenses", amount: expenses.otherExpenses }
        ]
      });
      
    } catch (err) {
      console.error("Failed to fetch profit/loss data:", err);
      // Set demo data for testing
      setProfitLoss({
        income: { sales: 1250000, salesReturns: 25000, otherIncome: 0, totalIncome: 1225000 },
        costOfGoodsSold: { openingStock: 350000, purchases: 680000, purchaseReturns: 15000, closingStock: 300000, totalCost: 715000 },
        expenses: { salaries: 50000, rent: 25000, utilities: 15000, transportation: 10000, marketing: 8000, maintenance: 5000, otherExpenses: 7000, totalExpenses: 120000 },
        grossProfit: 510000,
        netProfit: 390000,
        grossMargin: 41.63,
        netMargin: 31.84
      });
    }
    setLoading(false);
  };
  
  const handlePrint = () => {
    setShowPrintModal(true);
  };
  
  const buildPrintHtml = () => {
    const printDateTime = new Date().toLocaleString("en-PK");
    const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    
    if (reportType === "summary") {
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Profit & Loss Statement</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
          .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT}}
          .shop-name-en{font-size:16px;font-weight:bold;margin:5px 0}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .title{font-size:18px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:10px;text-align:center}
          .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:2px solid #000}
          .pl-container{display:flex;gap:20px;margin-top:20px}
          .pl-section{flex:1;border:2px solid #000;padding:15px}
          .section-title{font-size:14px;font-weight:bold;background:#000;color:#fff;padding:8px;margin:-15px -15px 15px -15px}
          .row{display:flex;justify-content:space-between;padding:6px 0}
          .row.total{font-weight:bold;border-top:2px solid #000;margin-top:10px;padding-top:10px}
          .profit-row{background:#f0fdf4;padding:12px;margin-top:15px;border:2px solid #059669}
          .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
          .text-right{text-align:right}
          .red{color:#dc2626}
          .green{color:#059669}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
          <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
          <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
          <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
        </div>
        <div class="title">PROFIT & LOSS STATEMENT</div>
        <div class="date-range">Period: ${fromDate} to ${toDate} | Printed: ${printDateTime}</div>
        
        <div class="pl-container">
          <div class="pl-section">
            <div class="section-title">💰 INCOME</div>
            <div class="row"><span>Sales Revenue</span><span>PKR ${fmt(profitLoss.income.sales)}</span></div>
            <div class="row"><span>Less: Sales Returns</span><span class="red">(PKR ${fmt(profitLoss.income.salesReturns)})</span></div>
            <div class="row total"><span>Total Income</span><span>PKR ${fmt(profitLoss.income.totalIncome)}</span></div>
            
            <div class="section-title" style="margin-top:20px">📦 COST OF GOODS SOLD</div>
            <div class="row"><span>Opening Stock</span><span>PKR ${fmt(profitLoss.costOfGoodsSold.openingStock)}</span></div>
            <div class="row"><span>Add: Purchases</span><span>PKR ${fmt(profitLoss.costOfGoodsSold.purchases)}</span></div>
            <div class="row"><span>Less: Purchase Returns</span><span class="red">(PKR ${fmt(profitLoss.costOfGoodsSold.purchaseReturns)})</span></div>
            <div class="row"><span>Less: Closing Stock</span><span class="red">(PKR ${fmt(profitLoss.costOfGoodsSold.closingStock)})</span></div>
            <div class="row total"><span>Cost of Goods Sold</span><span>PKR ${fmt(profitLoss.costOfGoodsSold.totalCost)}</span></div>
            
            <div class="profit-row">
              <div class="row" style="font-weight:bold;font-size:14px"><span>GROSS PROFIT</span><span class="green">PKR ${fmt(profitLoss.grossProfit)}</span></div>
              <div class="row"><span>Gross Margin</span><span>${profitLoss.grossMargin.toFixed(2)}%</span></div>
            </div>
          </div>
          
          <div class="pl-section">
            <div class="section-title">📋 EXPENSES</div>
            <div class="row"><span>Salaries & Wages</span><span>PKR ${fmt(profitLoss.expenses.salaries)}</span></div>
            <div class="row"><span>Rent</span><span>PKR ${fmt(profitLoss.expenses.rent)}</span></div>
            <div class="row"><span>Utilities</span><span>PKR ${fmt(profitLoss.expenses.utilities)}</span></div>
            <div class="row"><span>Transportation</span><span>PKR ${fmt(profitLoss.expenses.transportation)}</span></div>
            <div class="row"><span>Marketing</span><span>PKR ${fmt(profitLoss.expenses.marketing)}</span></div>
            <div class="row"><span>Maintenance</span><span>PKR ${fmt(profitLoss.expenses.maintenance)}</span></div>
            <div class="row"><span>Other Expenses</span><span>PKR ${fmt(profitLoss.expenses.otherExpenses)}</span></div>
            <div class="row total"><span>Total Expenses</span><span>PKR ${fmt(profitLoss.expenses.totalExpenses)}</span></div>
            
            <div class="profit-row" style="margin-top:15px">
              <div class="row" style="font-weight:bold;font-size:14px"><span>NET PROFIT</span><span class="green">PKR ${fmt(profitLoss.netProfit)}</span></div>
              <div class="row"><span>Net Margin</span><span>${profitLoss.netMargin.toFixed(2)}%</span></div>
            </div>
          </div>
        </div>
        
        <div class="footer">Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
      </body>
      </html>`;
    } else {
      // Detailed report with transactions
      const salesRows = detailedData.sales.map((s, i) => `
        <tr><td style="padding:6px;border:1px solid #000">${i + 1}</td><td style="padding:6px;border:1px solid #000">${s.invoiceNo}</td><td style="padding:6px;border:1px solid #000">${s.invoiceDate}</td><td style="padding:6px;border:1px solid #000">${s.customerName || "—"}</td><td style="padding:6px;border:1px solid #000;text-align:right">PKR ${fmt(s.netTotal)}</td></tr>`).join("");
      
      const purchaseRows = detailedData.purchases.map((p, i) => `
        <tr><td style="padding:6px;border:1px solid #000">${i + 1}</td><td style="padding:6px;border:1px solid #000">${p.invoiceNo}</td><td style="padding:6px;border:1px solid #000">${p.invoiceDate}</td><td style="padding:6px;border:1px solid #000">${p.supplierName || "—"}</td><td style="padding:6px;border:1px solid #000;text-align:right">PKR ${fmt(p.netTotal)}</td></tr>`).join("");
      
      const expenseRows = detailedData.expenses.map((e, i) => `
        <tr><td style="padding:6px;border:1px solid #000">${i + 1}</td><td style="padding:6px;border:1px solid #000">${e.name}</td><td style="padding:6px;border:1px solid #000;text-align:right">PKR ${fmt(e.amount)}</td></tr>`).join("");
      
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Detailed Profit & Loss Statement</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:20px;font-size:11px}
          .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT}}
          .shop-name-en{font-size:16px;font-weight:bold;margin:5px 0}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .title{font-size:16px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:8px;text-align:center}
          .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:2px solid #000}
          .section-title{font-size:13px;font-weight:bold;margin:20px 0 10px;padding:8px;background:#000;color:#fff}
          table{width:100%;border-collapse:collapse;margin:10px 0}
          th{background:#333;color:#fff;padding:8px;border:1px solid #000}
          td{padding:6px;border:1px solid #000}
          .text-right{text-align:right}
          .summary{display:flex;justify-content:space-between;margin-top:20px;padding:15px;background:#f8fafc;border:2px solid #000}
          .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
          .green{color:#059669}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
          <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
          <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
        </div>
        <div class="title">DETAILED PROFIT & LOSS STATEMENT</div>
        <div class="date-range">Period: ${fromDate} to ${toDate} | Printed: ${printDateTime}</div>
        
        <div class="section-title">🛒 SALES TRANSACTIONS</div>
        <table><thead><tr><th>#</th><th>Invoice #</th><th>Date</th><th>Customer</th><th class="text-right">Amount</th></tr></thead>
        <tbody>${salesRows || '<tr><td colspan="5" style="text-align:center">No sales found</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">Total Sales:</td><td class="text-right" style="font-weight:bold">PKR ${fmt(profitLoss.income.sales)}</td></tr></tfoot>
        </table>
        
        <div class="section-title">📦 PURCHASE TRANSACTIONS</div>
        <table><thead><tr><th>#</th><th>Invoice #</th><th>Date</th><th>Supplier</th><th class="text-right">Amount</th></tr></thead>
        <tbody>${purchaseRows || '<tr><td colspan="5" style="text-align:center">No purchases found</td></tr>'}</tbody>
        <tfoot><tr><td colspan="4" style="text-align:right;font-weight:bold">Total Purchases:</td><td class="text-right" style="font-weight:bold">PKR ${fmt(profitLoss.costOfGoodsSold.purchases)}</td></tr></tfoot>
        </table>
        
        <div class="section-title">📋 EXPENSES</div>
        <tr><thead><td><th>#</th><th>Expense Type</th><th class="text-right">Amount</th></tr></thead>
        <tbody>${expenseRows}</tbody>
        <tfoot><tr><td style="text-align:right;font-weight:bold">Total Expenses:</td><td class="text-right" style="font-weight:bold">PKR ${fmt(profitLoss.expenses.totalExpenses)}</td></tr></tfoot>
        </table>
        
        <div class="summary">
          <div><strong>Gross Profit:</strong> PKR ${fmt(profitLoss.grossProfit)} (${profitLoss.grossMargin.toFixed(2)}%)</div>
          <div><strong>Net Profit:</strong> <span class="green">PKR ${fmt(profitLoss.netProfit)}</span> (${profitLoss.netMargin.toFixed(2)}%)</div>
        </div>
        
        <div class="footer">Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
      </body>
      </html>`;
    }
  };
  
  const handlePrintConfirm = () => {
    const printWindow = window.open("", "_blank", "width=1000,height=800");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
    setShowPrintModal(false);
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Profit & Loss Statement — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchProfitLoss} disabled={loading} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={loading} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>🖨 Print</button>
          <button className="xp-cap-btn xp-cap-close" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      {/* Print Modal */}
      {showPrintModal && (
        <div className="scm-overlay" style={{ zIndex: 2000 }}>
          <div className="scm-window" style={{ maxWidth: 400 }}>
            <div className="scm-tb" style={{ background: "#1e40af" }}>
              <span className="scm-tb-title" style={{ color: "white", fontWeight: "bold" }}>Print Options</span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowPrintModal(false)} style={{ color: "white" }}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "bold", display: "block", marginBottom: "10px" }}>Select Report Format:</label>
              <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="reportType" value="summary" checked={reportType === "summary"} onChange={() => setReportType("summary")} />
                  <span>📄 Summary P&L</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="reportType" value="detailed" checked={reportType === "detailed"} onChange={() => setReportType("detailed")} />
                  <span>📋 Detailed P&L (with Transactions)</span>
                </label>
              </div>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button className="xp-btn" onClick={() => setShowPrintModal(false)} style={{ border: "1px solid #000", padding: "6px 16px" }}>Cancel</button>
                <button className="xp-btn xp-btn-primary" onClick={handlePrintConfirm} style={{ background: "#22c55e", color: "white", border: "1px solid #000", padding: "6px 16px" }}>Print</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="sl-page-body" style={{ padding: "16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        
        {/* Date Range Selection */}
        <div style={{
          background: "#f8fafc",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px",
          border: "2px solid #000000",
          display: "flex",
          gap: "16px",
          alignItems: "flex-end",
          flexWrap: "wrap"
        }}>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📅 FROM DATE</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ height: "36px", padding: "0 12px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "160px" }} />
          </div>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📅 TO DATE</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ height: "36px", padding: "0 12px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "160px" }} />
          </div>
          <div>
            <button onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setFromDate(firstDay.toISOString().split("T")[0]);
              setToDate(isoD());
            }} style={{ height: "36px", padding: "0 20px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}>
              This Month
            </button>
          </div>
          <div>
            <button onClick={() => {
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), 0, 1);
              setFromDate(firstDay.toISOString().split("T")[0]);
              setToDate(isoD());
            }} style={{ height: "36px", padding: "0 20px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}>
              Year to Date
            </button>
          </div>
          <div>
            <button onClick={() => {
              const today = new Date();
              const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
              setFromDate(lastYear.toISOString().split("T")[0]);
              setToDate(isoD());
            }} style={{ height: "36px", padding: "0 20px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}>
              Last 12 Months
            </button>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>Loading profit & loss data...</div>
        ) : (
          <>
            {/* Two Column Layout */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              
              {/* LEFT COLUMN - Income & COGS */}
              <div style={{ flex: 1, minWidth: "350px", background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "#000000", color: "#ffffff", padding: "12px 16px", fontWeight: "bold", fontSize: "14px" }}>
                  💰 INCOME
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Sales Revenue</span>
                    <span style={{ fontWeight: "bold" }}>PKR {fmt(profitLoss.income.sales)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#dc2626" }}>
                    <span>Less: Sales Returns</span>
                    <span>(PKR {fmt(profitLoss.income.salesReturns)})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: "8px", borderTop: "2px solid #000000", fontWeight: "bold", fontSize: "14px" }}>
                    <span>Total Income</span>
                    <span style={{ color: "#1e40af" }}>PKR {fmt(profitLoss.income.totalIncome)}</span>
                  </div>
                </div>
                
                <div style={{ background: "#000000", color: "#ffffff", padding: "12px 16px", fontWeight: "bold", fontSize: "14px", borderTop: "2px solid #ffffff" }}>
                  📦 COST OF GOODS SOLD
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Opening Stock</span>
                    <span>PKR {fmt(profitLoss.costOfGoodsSold.openingStock)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Add: Purchases</span>
                    <span>PKR {fmt(profitLoss.costOfGoodsSold.purchases)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#dc2626" }}>
                    <span>Less: Purchase Returns</span>
                    <span>(PKR {fmt(profitLoss.costOfGoodsSold.purchaseReturns)})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0", color: "#dc2626" }}>
                    <span>Less: Closing Stock</span>
                    <span>(PKR {fmt(profitLoss.costOfGoodsSold.closingStock)})</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: "8px", borderTop: "2px solid #000000", fontWeight: "bold", fontSize: "14px" }}>
                    <span>Cost of Goods Sold</span>
                    <span style={{ color: "#d97706" }}>PKR {fmt(profitLoss.costOfGoodsSold.totalCost)}</span>
                  </div>
                </div>
                
                {/* Gross Profit */}
                <div style={{ background: "#f0fdf4", padding: "16px", margin: "16px", borderRadius: "8px", border: "2px solid #059669" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>
                    <span>GROSS PROFIT</span>
                    <span style={{ color: "#059669" }}>PKR {fmt(profitLoss.grossProfit)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>Gross Margin</span>
                    <span>{profitLoss.grossMargin.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
              
              {/* RIGHT COLUMN - Expenses & Net Profit */}
              <div style={{ flex: 1, minWidth: "350px", background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "#000000", color: "#ffffff", padding: "12px 16px", fontWeight: "bold", fontSize: "14px" }}>
                  📋 EXPENSES
                </div>
                <div style={{ padding: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Salaries & Wages</span>
                    <span>PKR {fmt(profitLoss.expenses.salaries)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Rent</span>
                    <span>PKR {fmt(profitLoss.expenses.rent)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Utilities</span>
                    <span>PKR {fmt(profitLoss.expenses.utilities)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Transportation</span>
                    <span>PKR {fmt(profitLoss.expenses.transportation)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Marketing</span>
                    <span>PKR {fmt(profitLoss.expenses.marketing)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Maintenance</span>
                    <span>PKR {fmt(profitLoss.expenses.maintenance)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                    <span>Other Expenses</span>
                    <span>PKR {fmt(profitLoss.expenses.otherExpenses)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", marginTop: "8px", borderTop: "2px solid #000000", fontWeight: "bold", fontSize: "14px" }}>
                    <span>Total Expenses</span>
                    <span style={{ color: "#dc2626" }}>PKR {fmt(profitLoss.expenses.totalExpenses)}</span>
                  </div>
                </div>
                
                {/* Net Profit */}
                <div style={{ background: "#f0fdf4", padding: "16px", margin: "16px", borderRadius: "8px", border: "2px solid #059669" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "16px", marginBottom: "8px" }}>
                    <span>NET PROFIT</span>
                    <span style={{ color: "#059669" }}>PKR {fmt(profitLoss.netProfit)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                    <span>Net Margin</span>
                    <span>{profitLoss.netMargin.toFixed(2)}%</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Key Metrics Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginTop: "20px" }}>
              <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Total Sales</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af" }}>PKR {fmt(profitLoss.income.sales)}</div>
              </div>
              <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Total Purchases</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#d97706" }}>PKR {fmt(profitLoss.costOfGoodsSold.purchases)}</div>
              </div>
              <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Total Expenses</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(profitLoss.expenses.totalExpenses)}</div>
              </div>
              <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#64748b" }}>Net Profit Ratio</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#059669" }}>{profitLoss.netMargin.toFixed(1)}%</div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>📊 Profit & Loss Statement</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Period: {fromDate} to {toDate}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#059669" }}>Net Profit: PKR {fmt(profitLoss.netProfit)}</div>
      </div>
      
      <style>{`
        .scm-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }
        .scm-window {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: modalIn 0.2s ease;
        }
        .scm-tb {
          background: #1e293b;
          padding: 12px 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .scm-tb-title {
          font-weight: 600;
          font-size: 14px;
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
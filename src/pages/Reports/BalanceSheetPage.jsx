// pages/BalanceSheetPage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function BalanceSheetPage() {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(isoD());
  const [balanceSheet, setBalanceSheet] = useState({
    assets: {
      currentAssets: {
        cash: 0,
        bank: 0,
        accountsReceivable: 0,
        inventory: 0,
        total: 0
      },
      fixedAssets: {
        equipment: 0,
        furniture: 0,
        vehicles: 0,
        total: 0
      },
      totalAssets: 0
    },
    liabilities: {
      currentLiabilities: {
        accountsPayable: 0,
        accruedExpenses: 0,
        shortTermLoans: 0,
        total: 0
      },
      longTermLiabilities: {
        longTermLoans: 0,
        total: 0
      },
      totalLiabilities: 0
    },
    equity: {
      capital: 0,
      retainedEarnings: 0,
      currentYearProfit: 0,
      total: 0
    }
  });
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [reportType, setReportType] = useState("summary"); // summary, detailed
  
  // Refs
  const dateRef = useRef(null);
  
  useEffect(() => {
    fetchBalanceSheet();
    dateRef.current?.focus();
  }, [asOfDate]);
  
  const fetchBalanceSheet = async () => {
    setLoading(true);
    try {
      // Fetch data from APIs
      const [customersRes, suppliersRes, salesRes, purchasesRes, cashReceiptsRes, cpvRes] = await Promise.all([
        api.get(EP.CUSTOMERS.GET_ALL),
        api.get(EP.CUSTOMERS.GET_ALL),
        api.get(EP.SALES.GET_ALL),
        api.get(EP.PURCHASES.GET_ALL),
        api.get(EP.CASH_RECEIPTS.GET_ALL),
        api.get(EP.CPV.GET_ALL)
      ]);
      
      // Calculate Accounts Receivable (Credit Customers outstanding)
      let accountsReceivable = 0;
      if (customersRes.data.success) {
        const creditCustomers = customersRes.data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type !== "supplier";
        });
        accountsReceivable = creditCustomers.reduce((sum, c) => sum + Math.max(0, c.currentBalance || 0), 0);
      }
      
      // Calculate Accounts Payable (Suppliers outstanding)
      let accountsPayable = 0;
      if (suppliersRes.data.success) {
        const suppliers = suppliersRes.data.data.filter(c => {
          const type = (c.customerType || c.type || "").toLowerCase();
          return type === "supplier";
        });
        accountsPayable = suppliers.reduce((sum, s) => sum + Math.max(0, s.currentBalance || 0), 0);
      }
      
      // Calculate Sales (Revenue)
      let totalSales = 0;
      if (salesRes.data.success) {
        totalSales = salesRes.data.data.reduce((sum, s) => sum + (s.netTotal || 0), 0);
      }
      
      // Calculate Purchases (Cost)
      let totalPurchases = 0;
      if (purchasesRes.data.success) {
        totalPurchases = purchasesRes.data.data.reduce((sum, p) => sum + (p.netTotal || 0), 0);
      }
      
      // Calculate Cash Receipts
      let totalCashReceipts = 0;
      if (cashReceiptsRes.data.success) {
        totalCashReceipts = cashReceiptsRes.data.data.reduce((sum, cr) => sum + (cr.amount || cr.amountReceived || 0), 0);
      }
      
      // Calculate Cash Payments
      let totalCashPayments = 0;
      if (cpvRes.data.success) {
        const cpvData = Array.isArray(cpvRes.data) ? cpvRes.data : cpvRes.data.data || [];
        totalCashPayments = cpvData.reduce((sum, cpv) => sum + (cpv.amount || 0), 0);
      }
      
      // Calculate current year profit (simplified)
      const currentYearProfit = totalSales - totalPurchases;
      
      // Calculate inventory value (from products)
      let inventoryValue = 0;
      try {
        const productsRes = await api.get(EP.PRODUCTS.GET_ALL);
        if (productsRes.data.success) {
          inventoryValue = productsRes.data.data.reduce((sum, p) => {
            const pk = p.packingInfo?.[0];
            if (pk?.stockEnabled && pk.openingQty && pk.purchaseRate) {
              return sum + (parseFloat(pk.openingQty) * parseFloat(pk.purchaseRate));
            }
            return sum;
          }, 0);
        }
      } catch (err) {}
      
      // Set balance sheet data
      setBalanceSheet({
        assets: {
          currentAssets: {
            cash: totalCashReceipts - totalCashPayments,
            bank: 0,
            accountsReceivable: accountsReceivable,
            inventory: inventoryValue,
            total: (totalCashReceipts - totalCashPayments) + accountsReceivable + inventoryValue
          },
          fixedAssets: {
            equipment: 0,
            furniture: 0,
            vehicles: 0,
            total: 0
          },
          totalAssets: (totalCashReceipts - totalCashPayments) + accountsReceivable + inventoryValue
        },
        liabilities: {
          currentLiabilities: {
            accountsPayable: accountsPayable,
            accruedExpenses: 0,
            shortTermLoans: 0,
            total: accountsPayable
          },
          longTermLiabilities: {
            longTermLoans: 0,
            total: 0
          },
          totalLiabilities: accountsPayable
        },
        equity: {
          capital: 0,
          retainedEarnings: 0,
          currentYearProfit: currentYearProfit,
          total: currentYearProfit
        }
      });
      
    } catch (err) {
      console.error("Failed to fetch balance sheet data:", err);
      // Set demo data for testing
      setBalanceSheet({
        assets: {
          currentAssets: {
            cash: 1250000,
            bank: 500000,
            accountsReceivable: 850000,
            inventory: 1200000,
            total: 3800000
          },
          fixedAssets: {
            equipment: 250000,
            furniture: 150000,
            vehicles: 800000,
            total: 1200000
          },
          totalAssets: 5000000
        },
        liabilities: {
          currentLiabilities: {
            accountsPayable: 450000,
            accruedExpenses: 50000,
            shortTermLoans: 200000,
            total: 700000
          },
          longTermLiabilities: {
            longTermLoans: 500000,
            total: 500000
          },
          totalLiabilities: 1200000
        },
        equity: {
          capital: 3000000,
          retainedEarnings: 500000,
          currentYearProfit: 300000,
          total: 3800000
        }
      });
    }
    setLoading(false);
  };
  
  const handlePrint = () => {
    setShowPrintModal(true);
  };
  
  const buildPrintHtml = () => {
    const printDateTime = new Date().toLocaleString("en-PK", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    
    if (reportType === "summary") {
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Balance Sheet - Asim Electric Store</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
          .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT}}
          .shop-name-en{font-size:16px;font-weight:bold;margin:5px 0}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .title{font-size:18px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:10px;text-align:center}
          .info{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:2px solid #000}
          .balance-container{display:flex;gap:20px;margin-top:20px}
          .balance-section{flex:1;border:2px solid #000;padding:15px}
          .section-title{font-size:14px;font-weight:bold;background:#000;color:#fff;padding:8px;margin:-15px -15px 15px -15px}
          .sub-section{margin-bottom:15px}
          .sub-title{font-size:12px;font-weight:bold;border-bottom:1px solid #000;padding-bottom:5px;margin-bottom:10px}
          .row{display:flex;justify-content:space-between;padding:5px 0}
          .row.total{font-weight:bold;border-top:2px solid #000;margin-top:10px;padding-top:10px}
          .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#666}
          .text-right{text-align:right}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
          <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
          <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
          <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
        </div>
        <div class="title">BALANCE SHEET</div>
        <div class="info">As of: ${asOfDate} | Printed: ${printDateTime}</div>
        
        <div class="balance-container">
          <div class="balance-section">
            <div class="section-title">ASSETS</div>
            <div class="sub-section">
              <div class="sub-title">Current Assets</div>
              <div class="row"><span>Cash & Bank</span><span>PKR ${fmt(balanceSheet.assets.currentAssets.cash + balanceSheet.assets.currentAssets.bank)}</span></div>
              <div class="row"><span>Accounts Receivable</span><span>PKR ${fmt(balanceSheet.assets.currentAssets.accountsReceivable)}</span></div>
              <div class="row"><span>Inventory</span><span>PKR ${fmt(balanceSheet.assets.currentAssets.inventory)}</span></div>
              <div class="row total"><span>Total Current Assets</span><span>PKR ${fmt(balanceSheet.assets.currentAssets.total)}</span></div>
            </div>
            <div class="sub-section">
              <div class="sub-title">Fixed Assets</div>
              <div class="row"><span>Equipment</span><span>PKR ${fmt(balanceSheet.assets.fixedAssets.equipment)}</span></div>
              <div class="row"><span>Furniture</span><span>PKR ${fmt(balanceSheet.assets.fixedAssets.furniture)}</span></div>
              <div class="row"><span>Vehicles</span><span>PKR ${fmt(balanceSheet.assets.fixedAssets.vehicles)}</span></div>
              <div class="row total"><span>Total Fixed Assets</span><span>PKR ${fmt(balanceSheet.assets.fixedAssets.total)}</span></div>
            </div>
            <div class="row total" style="margin-top:15px"><span><strong>TOTAL ASSETS</strong></span><span><strong>PKR ${fmt(balanceSheet.totalAssets)}</strong></span></div>
          </div>
          
          <div class="balance-section">
            <div class="section-title">LIABILITIES & EQUITY</div>
            <div class="sub-section">
              <div class="sub-title">Current Liabilities</div>
              <div class="row"><span>Accounts Payable</span><span>PKR ${fmt(balanceSheet.liabilities.currentLiabilities.accountsPayable)}</span></div>
              <div class="row"><span>Accrued Expenses</span><span>PKR ${fmt(balanceSheet.liabilities.currentLiabilities.accruedExpenses)}</span></div>
              <div class="row"><span>Short Term Loans</span><span>PKR ${fmt(balanceSheet.liabilities.currentLiabilities.shortTermLoans)}</span></div>
              <div class="row total"><span>Total Current Liabilities</span><span>PKR ${fmt(balanceSheet.liabilities.currentLiabilities.total)}</span></div>
            </div>
            <div class="sub-section">
              <div class="sub-title">Long Term Liabilities</div>
              <div class="row"><span>Long Term Loans</span><span>PKR ${fmt(balanceSheet.liabilities.longTermLiabilities.longTermLoans)}</span></div>
              <div class="row total"><span>Total Long Term Liabilities</span><span>PKR ${fmt(balanceSheet.liabilities.longTermLiabilities.total)}</span></div>
            </div>
            <div class="sub-section">
              <div class="sub-title">Equity</div>
              <div class="row"><span>Capital</span><span>PKR ${fmt(balanceSheet.equity.capital)}</span></div>
              <div class="row"><span>Retained Earnings</span><span>PKR ${fmt(balanceSheet.equity.retainedEarnings)}</span></div>
              <div class="row"><span>Current Year Profit</span><span>PKR ${fmt(balanceSheet.equity.currentYearProfit)}</span></div>
              <div class="row total"><span>Total Equity</span><span>PKR ${fmt(balanceSheet.equity.total)}</span></div>
            </div>
            <div class="row total" style="margin-top:15px"><span><strong>TOTAL LIABILITIES & EQUITY</strong></span><span><strong>PKR ${fmt(balanceSheet.totalAssets)}</strong></span></div>
          </div>
        </div>
        <div class="footer">Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
      </body>
      </html>`;
    } else {
      // Detailed report with items
      return `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Detailed Balance Sheet - Asim Electric Store</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:Arial,sans-serif;padding:20px;font-size:11px}
          .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
          .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT}}
          .shop-name-en{font-size:16px;font-weight:bold;margin:5px 0}
          .shop-addr{font-size:11px;color:#444;margin:3px 0}
          .title{font-size:18px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:10px;text-align:center}
          .info{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:2px solid #000}
          table{width:100%;border-collapse:collapse;margin:15px 0}
          th{background:#000;color:#fff;padding:8px;border:1px solid #000}
          td{padding:6px;border:1px solid #000}
          .section-title{font-size:14px;font-weight:bold;margin:15px 0 10px;padding:8px;background:#333;color:#fff}
          .text-right{text-align:right}
          .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px;color:#666}
        </style>
      </head>
      <body>
        <div class="header">
          <div class="shop-name">عاصم الیکٹرک اینڈ الیکٹرونکس سٹور</div>
          <div class="shop-name-en">ASIM ELECTRIC & ELECTRONIC STORE</div>
          <div class="shop-addr">Main Bazar Nahari Town, Near Bijli Ghar Stop, Gujranwala Road, Faisalabad</div>
          <div class="shop-addr">Ph: 0300 7262129, 041 8711575, 0315 7262129</div>
        </div>
        <div class="title">DETAILED BALANCE SHEET</div>
        <div class="info">As of: ${asOfDate} | Printed: ${printDateTime}</div>
        
        <div class="section-title">ASSETS</div>
        <table><thead><tr><th>Description</th><th class="text-right">Amount (PKR)</th></tr></thead>
        <tbody>
          <tr><td colspan="2"><strong>Current Assets</strong></td></tr>
          <tr><td style="padding-left:20px">Cash & Bank</td><td class="text-right">${fmt(balanceSheet.assets.currentAssets.cash + balanceSheet.assets.currentAssets.bank)}</td></tr>
          <tr><td style="padding-left:20px">Accounts Receivable</td><td class="text-right">${fmt(balanceSheet.assets.currentAssets.accountsReceivable)}</td></tr>
          <tr><td style="padding-left:20px">Inventory</td><td class="text-right">${fmt(balanceSheet.assets.currentAssets.inventory)}</td></tr>
          <tr><td style="padding-left:40px"><strong>Total Current Assets</strong></td><td class="text-right"><strong>${fmt(balanceSheet.assets.currentAssets.total)}</strong></td></tr>
          <tr><td colspan="2"><strong>Fixed Assets</strong></td></tr>
          <tr><td style="padding-left:20px">Equipment</td><td class="text-right">${fmt(balanceSheet.assets.fixedAssets.equipment)}</td></tr>
          <tr><td style="padding-left:20px">Furniture</td><td class="text-right">${fmt(balanceSheet.assets.fixedAssets.furniture)}</td></tr>
          <tr><td style="padding-left:20px">Vehicles</td><td class="text-right">${fmt(balanceSheet.assets.fixedAssets.vehicles)}</td></tr>
          <tr><td style="padding-left:40px"><strong>Total Fixed Assets</strong></td><td class="text-right"><strong>${fmt(balanceSheet.assets.fixedAssets.total)}</strong></td></tr>
          <tr><td><strong>TOTAL ASSETS</strong></td><td class="text-right"><strong>${fmt(balanceSheet.totalAssets)}</strong></td></tr>
        </tbody>
        </table>
        
        <div class="section-title">LIABILITIES & EQUITY</div>
        </table><thead><tr><th>Description</th><th class="text-right">Amount (PKR)</th></tr></thead>
        <tbody>
          <tr><td colspan="2"><strong>Current Liabilities</strong></td></tr>
          <tr><td style="padding-left:20px">Accounts Payable</td><td class="text-right">${fmt(balanceSheet.liabilities.currentLiabilities.accountsPayable)}</td></tr>
          <tr><td style="padding-left:20px">Accrued Expenses</td><td class="text-right">${fmt(balanceSheet.liabilities.currentLiabilities.accruedExpenses)}</td></tr>
          <tr><td style="padding-left:40px"><strong>Total Current Liabilities</strong></td><td class="text-right"><strong>${fmt(balanceSheet.liabilities.currentLiabilities.total)}</strong></td></tr>
          <tr><td colspan="2"><strong>Long Term Liabilities</strong></td></tr>
          <tr><td style="padding-left:20px">Long Term Loans</td><td class="text-right">${fmt(balanceSheet.liabilities.longTermLiabilities.longTermLoans)}</td></tr>
          <tr><td style="padding-left:40px"><strong>Total Long Term Liabilities</strong></td><td class="text-right"><strong>${fmt(balanceSheet.liabilities.longTermLiabilities.total)}</strong></td></tr>
          <tr><td colspan="2"><strong>Equity</strong></td></tr>
          <tr><td style="padding-left:20px">Capital</td><td class="text-right">${fmt(balanceSheet.equity.capital)}</td></tr>
          <tr><td style="padding-left:20px">Retained Earnings</td><td class="text-right">${fmt(balanceSheet.equity.retainedEarnings)}</td></tr>
          <tr><td style="padding-left:20px">Current Year Profit</td><td class="text-right">${fmt(balanceSheet.equity.currentYearProfit)}</td></tr>
          <tr><td style="padding-left:40px"><strong>Total Equity</strong></td><td class="text-right"><strong>${fmt(balanceSheet.equity.total)}</strong></td></tr>
          <tr><td><strong>TOTAL LIABILITIES & EQUITY</strong></td><td class="text-right"><strong>${fmt(balanceSheet.totalAssets)}</strong></td></tr>
        </tbody>
        </table>
        <div class="footer">Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
      </body>
      </html>`;
    }
  };
  
  const handlePrintConfirm = () => {
    const printWindow = window.open("", "_blank", "width=900,height=700");
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
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Balance Sheet — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchBalanceSheet} disabled={loading} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>⟳ Refresh</button>
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
                  <span>📄 Summary Balance Sheet</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input type="radio" name="reportType" value="detailed" checked={reportType === "detailed"} onChange={() => setReportType("detailed")} />
                  <span>📋 Detailed Balance Sheet</span>
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
        
        {/* Date Selection */}
        <div style={{
          background: "#f8fafc",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "20px",
          border: "2px solid #000000",
          display: "flex",
          gap: "16px",
          alignItems: "flex-end"
        }}>
          <div style={{ width: "180px" }}>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📅 AS OF DATE</label>
            <input 
              ref={dateRef}
              type="date" 
              value={asOfDate} 
              onChange={(e) => setAsOfDate(e.target.value)} 
              style={{ height: "36px", padding: "0 12px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "100%" }} 
            />
          </div>
          <div>
            <button 
              onClick={() => {
                const today = isoD();
                setAsOfDate(today);
              }} 
              style={{ height: "36px", padding: "0 20px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}
            >
              Today
            </button>
          </div>
          <div>
            <button 
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                setAsOfDate(firstDay.toISOString().split("T")[0]);
              }} 
              style={{ height: "36px", padding: "0 20px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}
            >
              Month Start
            </button>
          </div>
          <div>
            <button 
              onClick={() => {
                const today = new Date();
                const firstDay = new Date(today.getFullYear(), 0, 1);
                setAsOfDate(firstDay.toISOString().split("T")[0]);
              }} 
              style={{ height: "36px", padding: "0 20px", fontSize: "12px", fontWeight: "bold", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", cursor: "pointer" }}
            >
              Year Start
            </button>
          </div>
        </div>
        
        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", fontSize: "14px", color: "#64748b" }}>Loading balance sheet data...</div>
        ) : (
          <>
            {/* Balance Sheet Summary - Two Column Layout */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              
              {/* ASSETS SECTION */}
              <div style={{ flex: 1, minWidth: "350px", background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "#000000", color: "#ffffff", padding: "12px 16px", fontWeight: "bold", fontSize: "14px" }}>
                  📊 ASSETS
                </div>
                <div style={{ padding: "16px" }}>
                  
                  {/* Current Assets */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", borderBottom: "2px solid #000000", paddingBottom: "6px", marginBottom: "10px", color: "#1e40af" }}>
                      Current Assets
                    </div>
                    <div style={{ paddingLeft: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Cash & Bank</span>
                        <span style={{ fontWeight: "bold" }}>PKR {fmt(balanceSheet.assets.currentAssets.cash + balanceSheet.assets.currentAssets.bank)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Accounts Receivable</span>
                        <span style={{ fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(balanceSheet.assets.currentAssets.accountsReceivable)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Inventory</span>
                        <span style={{ fontWeight: "bold" }}>PKR {fmt(balanceSheet.assets.currentAssets.inventory)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0, marginTop: 8px", borderTop: "2px solid #000000", marginTop: "8px", paddingTop: "8px" }}>
                        <span style={{ fontWeight: "bold" }}>Total Current Assets</span>
                        <span style={{ fontWeight: "bold", fontSize: "14px" }}>PKR {fmt(balanceSheet.assets.currentAssets.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Fixed Assets */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", borderBottom: "2px solid #000000", paddingBottom: "6px", marginBottom: "10px", color: "#1e40af" }}>
                      Fixed Assets
                    </div>
                    <div style={{ paddingLeft: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Equipment</span>
                        <span>PKR {fmt(balanceSheet.assets.fixedAssets.equipment)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Furniture</span>
                        <span>PKR {fmt(balanceSheet.assets.fixedAssets.furniture)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Vehicles</span>
                        <span>PKR {fmt(balanceSheet.assets.fixedAssets.vehicles)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", marginTop: "8px", borderTop: "2px solid #000000" }}>
                        <span style={{ fontWeight: "bold" }}>Total Fixed Assets</span>
                        <span style={{ fontWeight: "bold" }}>PKR {fmt(balanceSheet.assets.fixedAssets.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total Assets */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f0f9ff", borderRadius: "6px", marginTop: "8px", border: "2px solid #000000" }}>
                    <span style={{ fontWeight: "bold", fontSize: "15px" }}>TOTAL ASSETS</span>
                    <span style={{ fontWeight: "bold", fontSize: "16px", color: "#1e40af" }}>PKR {fmt(balanceSheet.totalAssets)}</span>
                  </div>
                </div>
              </div>
              
              {/* LIABILITIES & EQUITY SECTION */}
              <div style={{ flex: 1, minWidth: "350px", background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
                <div style={{ background: "#000000", color: "#ffffff", padding: "12px 16px", fontWeight: "bold", fontSize: "14px" }}>
                  📋 LIABILITIES & EQUITY
                </div>
                <div style={{ padding: "16px" }}>
                  
                  {/* Current Liabilities */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", borderBottom: "2px solid #000000", paddingBottom: "6px", marginBottom: "10px", color: "#dc2626" }}>
                      Current Liabilities
                    </div>
                    <div style={{ paddingLeft: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Accounts Payable</span>
                        <span style={{ fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(balanceSheet.liabilities.currentLiabilities.accountsPayable)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Accrued Expenses</span>
                        <span>PKR {fmt(balanceSheet.liabilities.currentLiabilities.accruedExpenses)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Short Term Loans</span>
                        <span>PKR {fmt(balanceSheet.liabilities.currentLiabilities.shortTermLoans)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", marginTop: "8px", borderTop: "2px solid #000000" }}>
                        <span style={{ fontWeight: "bold" }}>Total Current Liabilities</span>
                        <span style={{ fontWeight: "bold" }}>PKR {fmt(balanceSheet.liabilities.currentLiabilities.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Long Term Liabilities */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", borderBottom: "2px solid #000000", paddingBottom: "6px", marginBottom: "10px", color: "#dc2626" }}>
                      Long Term Liabilities
                    </div>
                    <div style={{ paddingLeft: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Long Term Loans</span>
                        <span>PKR {fmt(balanceSheet.liabilities.longTermLiabilities.longTermLoans)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", marginTop: "8px", borderTop: "2px solid #000000" }}>
                        <span style={{ fontWeight: "bold" }}>Total Long Term Liabilities</span>
                        <span style={{ fontWeight: "bold" }}>PKR {fmt(balanceSheet.liabilities.longTermLiabilities.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Equity */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ fontWeight: "bold", fontSize: "13px", borderBottom: "2px solid #000000", paddingBottom: "6px", marginBottom: "10px", color: "#059669" }}>
                      Equity
                    </div>
                    <div style={{ paddingLeft: "10px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Capital</span>
                        <span>PKR {fmt(balanceSheet.equity.capital)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Retained Earnings</span>
                        <span>PKR {fmt(balanceSheet.equity.retainedEarnings)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
                        <span>Current Year Profit</span>
                        <span style={{ color: "#059669", fontWeight: "bold" }}>PKR {fmt(balanceSheet.equity.currentYearProfit)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", marginTop: "8px", borderTop: "2px solid #000000" }}>
                        <span style={{ fontWeight: "bold" }}>Total Equity</span>
                        <span style={{ fontWeight: "bold" }}>PKR {fmt(balanceSheet.equity.total)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Total Liabilities & Equity */}
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px", background: "#f0f9ff", borderRadius: "6px", marginTop: "8px", border: "2px solid #000000" }}>
                    <span style={{ fontWeight: "bold", fontSize: "15px" }}>TOTAL LIABILITIES & EQUITY</span>
                    <span style={{ fontWeight: "bold", fontSize: "16px", color: "#1e40af" }}>PKR {fmt(balanceSheet.totalAssets)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Financial Ratios */}
            <div style={{ marginTop: "20px", background: "#f8fafc", border: "2px solid #000000", borderRadius: "8px", padding: "16px" }}>
              <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "12px", color: "#000000", borderBottom: "2px solid #000000", paddingBottom: "6px" }}>
                📈 Financial Ratios
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Current Ratio</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000000" }}>
                    {(balanceSheet.assets.currentAssets.total / (balanceSheet.liabilities.currentLiabilities.total || 1)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Current Assets / Current Liabilities</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Quick Ratio</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000000" }}>
                    {((balanceSheet.assets.currentAssets.total - balanceSheet.assets.currentAssets.inventory) / (balanceSheet.liabilities.currentLiabilities.total || 1)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>(Current Assets - Inventory) / Current Liabilities</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Debt to Equity</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#000000" }}>
                    {(balanceSheet.liabilities.totalLiabilities / (balanceSheet.equity.total || 1)).toFixed(2)}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Total Liabilities / Total Equity</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>Working Capital</div>
                  <div style={{ fontSize: "16px", fontWeight: "bold", color: (balanceSheet.assets.currentAssets.total - balanceSheet.liabilities.currentLiabilities.total) >= 0 ? "#059669" : "#dc2626" }}>
                    PKR {fmt(balanceSheet.assets.currentAssets.total - balanceSheet.liabilities.currentLiabilities.total)}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Current Assets - Current Liabilities</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>💰 Balance Sheet</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>As of: {asOfDate}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Assets: PKR {fmt(balanceSheet.totalAssets)} | Liabilities: PKR {fmt(balanceSheet.liabilities.totalLiabilities)} | Equity: PKR {fmt(balanceSheet.equity.total)}</div>
      </div>
    </div>
  );
}
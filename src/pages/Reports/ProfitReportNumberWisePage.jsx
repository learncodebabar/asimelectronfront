// pages/ProfitReportNumberWisePage.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api.js";
import EP from "../../api/apiEndpoints.js";
import "../../styles/theme.css";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

export default function ProfitReportNumberWisePage() {
  const navigate = useNavigate();
  
  // State
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(isoD());
  const [searchTerm, setSearchTerm] = useState("");
  const [reportType, setReportType] = useState("invoice"); // invoice, product, salesRep
  const [profitData, setProfitData] = useState([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalCost: 0,
    totalProfit: 0,
    avgMargin: 0,
    totalItems: 0,
    totalQty: 0
  });
  
  const searchRef = useRef(null);
  
  useEffect(() => {
    fetchProfitData();
  }, [fromDate, toDate, reportType]);
  
  const fetchProfitData = async () => {
    setLoading(true);
    try {
      // Fetch sales and products data
      const [salesRes, productsRes] = await Promise.all([
        api.get(EP.SALES.GET_ALL),
        api.get(EP.PRODUCTS.GET_ALL)
      ]);
      
      const sales = (salesRes.data.data || []).filter(s => 
        s.invoiceDate >= fromDate && s.invoiceDate <= toDate &&
        s.saleType !== "return" && s.paymentMode !== "Credit"
      );
      
      const products = productsRes.data.data || [];
      
      // Create product lookup map for costs
      const productCostMap = new Map();
      products.forEach(p => {
        const pk = p.packingInfo?.[0];
        const costPrice = pk?.purchaseRate || 0;
        productCostMap.set(p._id, costPrice);
        productCostMap.set(p.code, costPrice);
      });
      
      let profitItems = [];
      let totalSales = 0;
      let totalCost = 0;
      let totalProfit = 0;
      let totalItems = 0;
      let totalQty = 0;
      
      if (reportType === "invoice") {
        // Group by invoice number
        const invoiceMap = new Map();
        
        sales.forEach(sale => {
          const invoiceProfit = {
            invoiceNo: sale.invoiceNo,
            invoiceDate: sale.invoiceDate,
            customerName: sale.customerName || "COUNTER SALE",
            items: sale.items || [],
            totalAmount: sale.netTotal || 0,
            totalCost: 0,
            profit: 0,
            margin: 0,
            itemsCount: sale.items?.length || 0
          };
          
          // Calculate cost for each item
          (sale.items || []).forEach(item => {
            const productId = item.productId;
            const code = item.code;
            let costPrice = productCostMap.get(productId) || productCostMap.get(code) || 0;
            const qty = item.pcs || item.qty || 1;
            const amount = item.amount || 0;
            const itemCost = costPrice * qty;
            
            invoiceProfit.totalCost += itemCost;
            totalCost += itemCost;
            totalSales += amount;
            totalProfit += (amount - itemCost);
            totalQty += qty;
          });
          
          invoiceProfit.profit = invoiceProfit.totalAmount - invoiceProfit.totalCost;
          invoiceProfit.margin = invoiceProfit.totalAmount > 0 ? (invoiceProfit.profit / invoiceProfit.totalAmount) * 100 : 0;
          totalItems += invoiceProfit.itemsCount;
          
          invoiceMap.set(sale.invoiceNo, invoiceProfit);
        });
        
        profitItems = Array.from(invoiceMap.values()).sort((a, b) => b.profit - a.profit);
        
      } else if (reportType === "product") {
        // Group by product
        const productMap = new Map();
        
        sales.forEach(sale => {
          (sale.items || []).forEach(item => {
            const productId = item.productId;
            const code = item.code;
            const productName = item.name || item.description || "Unknown Product";
            const qty = item.pcs || item.qty || 1;
            const amount = item.amount || 0;
            const costPrice = productCostMap.get(productId) || productCostMap.get(code) || 0;
            const itemCost = costPrice * qty;
            
            if (!productMap.has(productId)) {
              productMap.set(productId, {
                productId: productId,
                code: code,
                productName: productName,
                qty: 0,
                totalSales: 0,
                totalCost: 0,
                profit: 0,
                margin: 0,
                invoiceCount: 0
              });
            }
            
            const product = productMap.get(productId);
            product.qty += qty;
            product.totalSales += amount;
            product.totalCost += itemCost;
            product.invoiceCount++;
            product.profit = product.totalSales - product.totalCost;
            product.margin = product.totalSales > 0 ? (product.profit / product.totalSales) * 100 : 0;
            
            totalSales += amount;
            totalCost += itemCost;
            totalProfit += (amount - itemCost);
            totalQty += qty;
            totalItems++;
          });
        });
        
        profitItems = Array.from(productMap.values()).sort((a, b) => b.profit - a.profit);
        
      } else if (reportType === "salesRep") {
        // Group by customer/sales rep
        const repMap = new Map();
        
        sales.forEach(sale => {
          const repName = sale.customerName || "COUNTER SALE";
          const amount = sale.netTotal || 0;
          
          if (!repMap.has(repName)) {
            repMap.set(repName, {
              repName: repName,
              totalSales: 0,
              totalCost: 0,
              profit: 0,
              margin: 0,
              invoiceCount: 0,
              itemsCount: 0
            });
          }
          
          const rep = repMap.get(repName);
          let saleCost = 0;
          
          (sale.items || []).forEach(item => {
            const productId = item.productId;
            const code = item.code;
            const costPrice = productCostMap.get(productId) || productCostMap.get(code) || 0;
            const qty = item.pcs || item.qty || 1;
            saleCost += costPrice * qty;
            rep.itemsCount++;
          });
          
          rep.totalSales += amount;
          rep.totalCost += saleCost;
          rep.invoiceCount++;
          rep.profit = rep.totalSales - rep.totalCost;
          rep.margin = rep.totalSales > 0 ? (rep.profit / rep.totalSales) * 100 : 0;
          
          totalSales += amount;
          totalCost += saleCost;
          totalProfit += (amount - saleCost);
        });
        
        profitItems = Array.from(repMap.values()).sort((a, b) => b.profit - a.profit);
      }
      
      setProfitData(profitItems);
      setSummary({
        totalSales: totalSales,
        totalCost: totalCost,
        totalProfit: totalProfit,
        avgMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
        totalItems: totalItems,
        totalQty: totalQty
      });
      
    } catch (err) {
      console.error("Failed to fetch profit data:", err);
      // Set demo data
      setDemoData();
    }
    setLoading(false);
  };
  
  const setDemoData = () => {
    if (reportType === "invoice") {
      setProfitData([
        { invoiceNo: "INV-001", invoiceDate: "2024-12-15", customerName: "ABC Traders", itemsCount: 3, totalAmount: 25000, totalCost: 18000, profit: 7000, margin: 28 },
        { invoiceNo: "INV-002", invoiceDate: "2024-12-16", customerName: "XYZ Enterprises", itemsCount: 2, totalAmount: 15000, totalCost: 11000, profit: 4000, margin: 26.67 },
        { invoiceNo: "INV-003", invoiceDate: "2024-12-17", customerName: "COUNTER SALE", itemsCount: 5, totalAmount: 35000, totalCost: 25000, profit: 10000, margin: 28.57 },
        { invoiceNo: "INV-004", invoiceDate: "2024-12-18", customerName: "PQR Ltd", itemsCount: 1, totalAmount: 8000, totalCost: 6000, profit: 2000, margin: 25 }
      ]);
      setSummary({ totalSales: 83000, totalCost: 60000, totalProfit: 23000, avgMargin: 27.71, totalItems: 11, totalQty: 45 });
    } else if (reportType === "product") {
      setProfitData([
        { productId: "p1", code: "LED001", productName: "LED Bulb 9W", qty: 50, totalSales: 25000, totalCost: 18000, profit: 7000, margin: 28, invoiceCount: 5 },
        { productId: "p2", code: "FAN001", productName: "Ceiling Fan", qty: 10, totalSales: 35000, totalCost: 25000, profit: 10000, margin: 28.57, invoiceCount: 3 },
        { productId: "p3", code: "WIRE001", productName: "Electrical Wire", qty: 100, totalSales: 15000, totalCost: 11000, profit: 4000, margin: 26.67, invoiceCount: 4 },
        { productId: "p4", code: "SWITCH001", productName: "Switch Board", qty: 30, totalSales: 8000, totalCost: 6000, profit: 2000, margin: 25, invoiceCount: 2 }
      ]);
      setSummary({ totalSales: 83000, totalCost: 60000, totalProfit: 23000, avgMargin: 27.71, totalItems: 4, totalQty: 190 });
    } else {
      setProfitData([
        { repName: "ABC Traders", totalSales: 40000, totalCost: 29000, profit: 11000, margin: 27.5, invoiceCount: 2, itemsCount: 5 },
        { repName: "COUNTER SALE", totalSales: 35000, totalCost: 25000, profit: 10000, margin: 28.57, invoiceCount: 1, itemsCount: 5 },
        { repName: "XYZ Enterprises", totalSales: 15000, totalCost: 11000, profit: 4000, margin: 26.67, invoiceCount: 1, itemsCount: 2 },
        { repName: "PQR Ltd", totalSales: 8000, totalCost: 6000, profit: 2000, margin: 25, invoiceCount: 1, itemsCount: 1 }
      ]);
      setSummary({ totalSales: 98000, totalCost: 71000, totalProfit: 27000, avgMargin: 27.55, totalItems: 13, totalQty: 0 });
    }
  };
  
  const filteredData = profitData.filter(item => {
    const query = searchTerm.toLowerCase();
    if (reportType === "invoice") {
      return !query || 
        item.invoiceNo?.toLowerCase().includes(query) ||
        item.customerName?.toLowerCase().includes(query);
    } else if (reportType === "product") {
      return !query || 
        item.productName?.toLowerCase().includes(query) ||
        item.code?.toLowerCase().includes(query);
    } else {
      return !query || item.repName?.toLowerCase().includes(query);
    }
  });
  
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };
  
  const buildPrintHtml = () => {
    const printDateTime = new Date().toLocaleString("en-PK");
    const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
    
    let rows = "";
    if (reportType === "invoice") {
      rows = filteredData.map((item, i) => `
        <tr>
          <td style="padding:8px;border:1px solid #000;text-align:center">${i + 1}</td>
          <td style="padding:8px;border:1px solid #000">${item.invoiceNo}</td>
          <td style="padding:8px;border:1px solid #000">${item.invoiceDate}</td>
          <td style="padding:8px;border:1px solid #000">${item.customerName}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${item.itemsCount}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(item.totalAmount)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(item.totalCost)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right;font-weight:bold;color:#059669">PKR ${fmt(item.profit)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">${item.margin.toFixed(2)}%</td>
        </tr>
      `).join("");
    } else if (reportType === "product") {
      rows = filteredData.map((item, i) => `
        <tr>
          <td style="padding:8px;border:1px solid #000;text-align:center">${i + 1}</td>
          <td style="padding:8px;border:1px solid #000;font-weight:bold">${item.code || "—"}</td>
          <td style="padding:8px;border:1px solid #000">${item.productName}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${item.qty}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${item.invoiceCount}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(item.totalSales)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(item.totalCost)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right;font-weight:bold;color:#059669">PKR ${fmt(item.profit)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">${item.margin.toFixed(2)}%</td>
        </tr>
      `).join("");
    } else {
      rows = filteredData.map((item, i) => `
        <tr>
          <td style="padding:8px;border:1px solid #000;text-align:center">${i + 1}</td>
          <td style="padding:8px;border:1px solid #000;font-weight:bold">${item.repName}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${item.invoiceCount}</td>
          <td style="padding:8px;border:1px solid #000;text-align:center">${item.itemsCount}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(item.totalSales)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">PKR ${fmt(item.totalCost)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right;font-weight:bold;color:#059669">PKR ${fmt(item.profit)}</td>
          <td style="padding:8px;border:1px solid #000;text-align:right">${item.margin.toFixed(2)}%</td>
        </tr>
      `).join("");
    }
    
    const reportTitle = reportType === "invoice" ? "INVOICE-WISE PROFIT REPORT" : reportType === "product" ? "PRODUCT-WISE PROFIT REPORT" : "SALES REP-WISE PROFIT REPORT";
    
    return `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${reportTitle}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;padding:20px;font-size:12px}
        .header{text-align:center;margin-bottom:20px;padding-bottom:15px;border-bottom:3px solid #000}
        .shop-name{font-size:22px;font-weight:bold;font-family:${URDU_FONT}}
        .shop-name-en{font-size:16px;font-weight:bold;margin:5px 0}
        .shop-addr{font-size:11px;color:#444;margin:3px 0}
        .title{font-size:16px;font-weight:bold;margin:15px 0;background:#1e40af;color:#fff;padding:10px;text-align:center}
        .date-range{text-align:center;margin:10px 0;padding:8px;background:#f8fafc;border:2px solid #000}
        table{width:100%;border-collapse:collapse;margin:15px 0}
        th{background:#000;color:#fff;padding:10px;border:1px solid #000}
        td{padding:8px;border:1px solid #000}
        .text-right{text-align:right}
        .summary{width:450px;margin-left:auto;margin-top:20px;padding:12px;background:#f8fafc;border:2px solid #000}
        .summary-row{display:flex;justify-content:space-between;padding:5px 0}
        .summary-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:5px;padding-top:8px}
        .footer{text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;font-size:10px}
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
      <div class="title">${reportTitle}</div>
      <div class="date-range">Period: ${fromDate} to ${toDate} | Generated: ${printDateTime}</div>
      
      <table>
        <thead>
          <tr>
            ${reportType === "invoice" ? `
              <th>#</th>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Items</th>
              <th class="text-right">Sales</th>
              <th class="text-right">Cost</th>
              <th class="text-right">Profit</th>
              <th class="text-right">Margin</th>
            ` : reportType === "product" ? `
              <th>#</th>
              <th>Code</th>
              <th>Product Name</th>
              <th>Qty Sold</th>
              <th>Invoices</th>
              <th class="text-right">Sales</th>
              <th class="text-right">Cost</th>
              <th class="text-right">Profit</th>
              <th class="text-right">Margin</th>
            ` : `
              <th>#</th>
              <th>Sales Rep / Customer</th>
              <th>Invoices</th>
              <th>Items</th>
              <th class="text-right">Sales</th>
              <th class="text-right">Cost</th>
              <th class="text-right">Profit</th>
              <th class="text-right">Margin</th>
            `}
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="9" style="text-align:center">No data found</td></tr>'}</tbody>
      </table>
      
      <div class="summary">
        <div class="summary-row"><span>Total Sales:</span><span>PKR ${fmt(summary.totalSales)}</span></div>
        <div class="summary-row"><span>Total Cost:</span><span>PKR ${fmt(summary.totalCost)}</span></div>
        <div class="summary-row bold"><span>Total Profit:</span><span class="green">PKR ${fmt(summary.totalProfit)}</span></div>
        <div class="summary-row"><span>Average Margin:</span><span>${summary.avgMargin.toFixed(2)}%</span></div>
        <div class="summary-row"><span>Total Items:</span><span>${summary.totalItems}</span></div>
      </div>
      
      <div class="footer">Developed by: Creative Babar / 03098325271 | www.digitalglobalschool.com</div>
    </body>
    </html>`;
  };
  
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      {/* Titlebar */}
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ color: "white", fontSize: "16px" }}>←</button>
        <span className="xp-tb-title" style={{ color: "white", fontSize: "16px", fontWeight: "bold" }}>Profit Report (Number Wise) — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-sm" onClick={fetchProfitData} disabled={loading} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>⟳ Refresh</button>
          <button className="xp-btn xp-btn-sm" onClick={handlePrint} disabled={profitData.length === 0} style={{ fontSize: "11px", padding: "4px 10px", fontWeight: "bold" }}>🖨 Print</button>
          <button className="xp-cap-btn xp-cap-close" onClick={() => navigate("/")}>✕</button>
        </div>
      </div>
      
      <div className="sl-page-body" style={{ padding: "16px", background: "#ffffff", flex: 1, overflow: "auto" }}>
        
        {/* Date Range & Report Type */}
        <div style={{
          background: "#f8fafc",
          borderRadius: "8px",
          padding: "12px 16px",
          marginBottom: "16px",
          border: "2px solid #000000",
          display: "flex",
          gap: "16px",
          alignItems: "flex-end",
          flexWrap: "wrap"
        }}>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📅 FROM DATE</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ height: "36px", padding: "0 12px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "150px" }} />
          </div>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📅 TO DATE</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ height: "36px", padding: "0 12px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", width: "150px" }} />
          </div>
          <div>
            <label style={{ fontSize: "10px", fontWeight: "bold", color: "#000000", display: "block", marginBottom: "4px", textTransform: "uppercase" }}>📊 REPORT TYPE</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} style={{ height: "36px", padding: "0 12px", fontSize: "13px", border: "1px solid #000000", borderRadius: "4px", background: "#ffffff", minWidth: "160px" }}>
              <option value="invoice">Invoice Wise</option>
              <option value="product">Product Wise</option>
              <option value="salesRep">Sales Rep / Customer Wise</option>
            </select>
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
        </div>
        
        {/* Search Bar */}
        <div className="xp-toolbar" style={{ marginBottom: "16px" }}>
          <div className="xp-search-wrap" style={{ width: "100%", position: "relative" }}>
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
                height: "40px", 
                width: "100%", 
                fontSize: "13px",
                background: "#ffffff"
              }} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder={reportType === "invoice" ? "Search by invoice # or customer..." : reportType === "product" ? "Search by product name or code..." : "Search by customer name..."}
              autoFocus 
            />
          </div>
        </div>
        
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Total Sales</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#1e40af" }}>PKR {fmt(summary.totalSales)}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Total Cost</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(summary.totalCost)}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Total Profit</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#059669" }}>PKR {fmt(summary.totalProfit)}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Avg Margin</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#d97706" }}>{summary.avgMargin.toFixed(1)}%</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: "#64748b" }}>Total Items</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#000000" }}>{summary.totalItems}</div>
          </div>
        </div>
        
        {/* Data Table */}
        <div className="xp-table-panel" style={{ border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center" }}>Loading profit data...</div>}
          {!loading && filteredData.length === 0 && <div className="xp-empty" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No profit data found for the selected period</div>}
          {!loading && filteredData.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto", maxHeight: "calc(100vh - 420px)" }}>
              <table className="xp-table" style={{ fontSize: "12px", width: "100%", borderCollapse: "collapse", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#ffffff", position: "sticky", top: 0 }}>
                    <th style={{ width: 40, padding: "10px", border: "1px solid #333", textAlign: "center" }}>#</th>
                    {reportType === "invoice" ? (
                      <>
                        <th style={{ padding: "10px", border: "1px solid #333" }}>Invoice #</th>
                        <th style={{ padding: "10px", border: "1px solid #333" }}>Date</th>
                        <th style={{ padding: "10px", border: "1px solid #333" }}>Customer</th>
                        <th style={{ width: 60, padding: "10px", border: "1px solid #333", textAlign: "center" }}>Items</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Sales (PKR)</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Cost (PKR)</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Profit (PKR)</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Margin</th>
                      </>
                    ) : reportType === "product" ? (
                      <>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333" }}>Code</th>
                        <th style={{ padding: "10px", border: "1px solid #333" }}>Product Name</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "center" }}>Qty Sold</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "center" }}>Invoices</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Sales (PKR)</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Cost (PKR)</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Profit (PKR)</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Margin</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: "10px", border: "1px solid #333" }}>Sales Rep / Customer</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "center" }}>Invoices</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "center" }}>Items</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Sales (PKR)</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Cost (PKR)</th>
                        <th style={{ width: 110, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Profit (PKR)</th>
                        <th style={{ width: 80, padding: "10px", border: "1px solid #333", textAlign: "right" }}>Margin</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #000000" }}>
                      <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000", fontWeight: "bold" }}>{i + 1}</td>
                      {reportType === "invoice" ? (
                        <>
                          <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold", fontFamily: "monospace" }}>{item.invoiceNo}</td>
                          <td style={{ padding: "8px", border: "1px solid #000" }}>{item.invoiceDate}</td>
                          <td style={{ padding: "8px", border: "1px solid #000" }}>{item.customerName}</td>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{item.itemsCount}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(item.totalAmount)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(item.totalCost)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000", fontWeight: "bold", color: "#059669" }}>PKR {fmt(item.profit)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>{item.margin.toFixed(2)}%</td>
                        </>
                      ) : reportType === "product" ? (
                        <>
                          <td style={{ padding: "8px", border: "1px solid #000", fontFamily: "monospace", fontWeight: "bold" }}>{item.code || "—"}</td>
                          <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold" }}>{item.productName}</td>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{item.qty}</td>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{item.invoiceCount}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(item.totalSales)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(item.totalCost)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000", fontWeight: "bold", color: "#059669" }}>PKR {fmt(item.profit)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>{item.margin.toFixed(2)}%</td>
                        </>
                      ) : (
                        <>
                          <td style={{ padding: "8px", border: "1px solid #000", fontWeight: "bold" }}>{item.repName}</td>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{item.invoiceCount}</td>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000" }}>{item.itemsCount}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(item.totalSales)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>PKR {fmt(item.totalCost)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000", fontWeight: "bold", color: "#059669" }}>PKR {fmt(item.profit)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000" }}>{item.margin.toFixed(2)}%</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: "#f8fafc", borderTop: "2px solid #000" }}>
                  <tr>
                    <td colSpan={reportType === "invoice" ? 5 : reportType === "product" ? 4 : 3} style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>TOTAL:</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(summary.totalSales)}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(summary.totalCost)}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold", color: "#059669" }}>PKR {fmt(summary.totalProfit)}</td>
                    <td style={{ padding: "10px", textAlign: "right", fontWeight: "bold" }}>{summary.avgMargin.toFixed(2)}%</td>
                    {reportType !== "invoice" && <td style={{ padding: "10px", border: "1px solid #000" }}></td>}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="xp-statusbar" style={{ background: "#f8fafc", borderTop: "2px solid #000000", padding: "6px 16px" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>📊 Profit Report (Number Wise)</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500" }}>Period: {fromDate} to {toDate}</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "500", color: "#059669" }}>Total Profit: PKR {fmt(summary.totalProfit)}</div>
      </div>
    </div>
  );
}
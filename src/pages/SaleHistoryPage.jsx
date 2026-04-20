import { useState, useEffect, useRef, useCallback } from "react";
import "../styles/SaleHistoryPage.css";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const SHOP = "Asim Electric and Electronic Store";
const today = () => new Date().toISOString().split("T")[0];
const dAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};
const fmtD = (s) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}-${m}-${y}`;
};

const PRESETS = [
  { label: "Today", key: "today", from: today, to: today },
  { label: "Yesterday", key: "yest", from: () => dAgo(1), to: () => dAgo(1) },
  { label: "Last 7d", key: "7d", from: () => dAgo(6), to: today },
  { label: "Last 30d", key: "30d", from: () => dAgo(29), to: today },
  { label: "All", key: "all", from: () => "", to: () => "" },
];

const TABS = [
  { key: "all", label: "All Sales", src: "" },
  { key: "debit", label: "Debit", src: "debit" },
  { key: "credit", label: "Credit", src: "credit" },
  { key: "cash", label: "Cash", src: "cash" },
  { key: "return", label: "Returns", src: "return" },
];

/* ── Inline SVG icons ── */
const Ic = {
  history: (<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976c.383.086.76.2 1.126.342zm1.61.752a7 7 0 0 0-.861-.517l.457-.889A8 8 0 0 1 12.45 2.2zm1.44 1.196a7 7 0 0 0-.656-.787l.708-.706A8 8 0 0 1 14.2 3.2zm.963 1.517a7 7 0 0 0-.398-.901l.883-.469A8 8 0 0 1 15.4 5.07zm.376 1.763a7 7 0 0 0-.115-.987l.975-.213a8 8 0 0 1 .131 1.126zM16 7h-1a7 7 0 0 0-.082-1.06l.974-.222A8 8 0 0 1 16 7M8 3.5a.5.5 0 0 1 .5.5v4.375l2.82 1.128a.5.5 0 0 1-.646.742l-3-1.2A.5.5 0 0 1 7.5 8V4a.5.5 0 0 1 .5-.5M4.5 2.134A7 7 0 1 0 9 15.95V14.9a6 6 0 1 1-4.5-11.282z"/></svg>),
  search: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/></svg>),
  cal: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M2 2a1 1 0 0 0-1 1v1h14V3a1 1 0 0 0-1-1zm13 3H1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z"/></svg>),
  filter: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5z"/></svg>),
  pay: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1zM2 10h2a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2m4 0h6a1 1 0 0 1 0 2H6a1 1 0 0 1 0-2"/></svg>),
  clear: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/></svg>),
  list: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"/></svg>),
  cart: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M.5 1a.5.5 0 0 0 0 1h1.11l.401 1.607 1.498 7.985A.5.5 0 0 0 4 12h1a2 2 0 1 0 0 4 2 2 0 0 0 0-4h7a2 2 0 1 0 0 4 2 2 0 0 0 0-4h1a.5.5 0 0 0 .491-.408l1.5-8A.5.5 0 0 0 14.5 3H2.89l-.405-1.621A.5.5 0 0 0 2 1z"/></svg>),
  person: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6m2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0m4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4"/></svg>),
  cash: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4m0 1a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/><path d="M0 4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V6a2 2 0 0 1-2-2z"/></svg>),
  ret: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path fillRule="evenodd" d="M1.146 4.854a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L2.707 4H12.5A2.5 2.5 0 0 1 15 6.5v8a.5.5 0 0 1-1 0v-8A1.5 1.5 0 0 0 12.5 5H2.707l3.147 3.146a.5.5 0 1 1-.708.708z"/></svg>),
  bag: (<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a2.5 2.5 0 0 1 2.5 2.5V4h-5v-.5A2.5 2.5 0 0 1 8 1m3.5 3v-.5a3.5 3.5 0 1 0-7 0V4H1v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4z"/></svg>),
  receipt: (<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M1.92.506a.5.5 0 0 1 .434.14L3 1.293l.646-.647a.5.5 0 0 1 .708 0L5 1.293l.646-.647a.5.5 0 0 1 .708 0L7 1.293l.646-.647a.5.5 0 0 1 .708 0L9 1.293l.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .708 0l.646.647.646-.647a.5.5 0 0 1 .801.13l.5 1A.5.5 0 0 1 15 2v12a.5.5 0 0 1-.053.224l-.5 1a.5.5 0 0 1-.8.13L13 14.707l-.646.647a.5.5 0 0 1-.708 0L11 14.707l-.646.647a.5.5 0 0 1-.708 0L9 14.707l-.646.647a.5.5 0 0 1-.708 0L7 14.707l-.646.647a.5.5 0 0 1-.708 0L5 14.707l-.646.647a.5.5 0 0 1-.708 0L3 14.707l-.646.647a.5.5 0 0 1-.801-.13l-.5-1A.5.5 0 0 1 1 14V2a.5.5 0 0 1 .053-.224l.5-1a.5.5 0 0 1 .367-.27"/></svg>),
  print: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2.5 8a.5.5 0 1 0 0-1 .5.5 0 0 0 0 1"/><path d="M5 1a2 2 0 0 0-2 2v2H2a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a2 2 0 0 0-2-2z"/></svg>),
  wa: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326z"/></svg>),
  trash: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>),
  close: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>),
  inbox: (<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M4.98 4a.5.5 0 0 0-.39.188L1.54 8H6a.5.5 0 0 1 .5.5 1.5 1.5 0 1 0 3 0A.5.5 0 0 1 10 8h4.46l-3.05-3.812A.5.5 0 0 0 11.02 4zm-1.17-.437A1.5 1.5 0 0 1 4.98 3h6.04a1.5 1.5 0 0 1 1.17.563l3.7 4.625a.5.5 0 0 1 .106.374l-.39 3.124A1.5 1.5 0 0 1 14.117 13H1.883a1.5 1.5 0 0 1-1.489-1.314l-.39-3.124a.5.5 0 0 1 .106-.374z"/></svg>),
  hourglass: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M2 1.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-1v1a4.5 4.5 0 0 1-2.557 4.06c-.29.139-.443.377-.443.59v.7c0 .213.154.451.443.59A4.5 4.5 0 0 1 12.5 13v1h1a.5.5 0 0 1 0 1h-11a.5.5 0 1 1 0-1h1v-1a4.5 4.5 0 0 1 2.557-4.06c.29-.139.443-.377.443-.59v-.7c0-.213-.154-.451-.443-.59A4.5 4.5 0 0 1 3.5 3V2h-1a.5.5 0 0 1-.5-.5"/></svg>),
  chat: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4.414A2 2 0 0 0 3 11.586l-2 2V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12.793a.5.5 0 0 0 .854.353l2.853-2.853A1 1 0 0 1 4.414 12H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/></svg>),
  phone: (<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58z"/></svg>),
};

function printInvoice(sale) {
  const rows = (sale.items || [])
    .map((it, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${it.description}</td>
        <td>${it.measurement || ""}</td>
        <td align="right">${it.qty}</td>
        <td align="right">${Number(it.rate).toLocaleString()}</td>
        <td align="right">${it.disc || 0}%</td>
        <td align="right"><b>${Number(it.amount).toLocaleString()}</b></td>
      </tr>
    `).join("");
    
  const win = window.open("", "_blank", "width=800,height=600");
  win.document.write(`<!DOCTYPE html>
  <html>
    <head>
      <title>${sale.invoiceNo}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:12px;padding:15px}
        h2{text-align:center;font-size:16px;margin-bottom:5px}
        .meta{display:flex;justify-content:space-between;border:1px solid #000;padding:6px 10px;margin:8px 0}
        table{width:100%;border-collapse:collapse}
        th{background:#1a1a1a;color:#fff;padding:6px;border:1px solid #000}
        td{border:1px solid #000;padding:4px 6px}
        .totals{float:right;min-width:200px;border:1px solid #000;padding:8px 12px;margin-top:10px}
        .total-row{display:flex;justify-content:space-between;padding:2px 0}
        .total-row.bold{font-weight:bold;border-top:2px solid #000;margin-top:4px;padding-top:4px}
        .footer{text-align:center;margin-top:20px;clear:both}
        @media print{body{padding:5mm}}
      </style>
    </head>
    <body>
      <h2>${SHOP}</h2>
      <div class="meta">
        <span><b>Invoice:</b> ${sale.invoiceNo}</span>
        <span><b>Date:</b> ${fmtD(sale.invoiceDate)}</span>
        <span><b>Customer:</b> ${sale.customerName || "COUNTER SALE"}</span>
        <span><b>Payment:</b> ${sale.paymentMode}</span>
      </div>
      <table>
        <thead><tr><th>#</th><th>Description</th><th>Meas</th><th>Qty</th><th>Rate</th><th>Disc%</th><th>Amount</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="total-row"><span>Sub Total</span><span>${Number(sale.subTotal || 0).toLocaleString()}</span></div>
        ${(sale.discAmount || 0) > 0 ? `<div class="total-row"><span>Discount</span><span>-${Number(sale.discAmount).toLocaleString()}</span></div>` : ""}
        <div class="total-row bold"><span>Net Total</span><span>${Number(sale.netTotal || 0).toLocaleString()}</span></div>
        <div class="total-row"><span>Paid</span><span>${Number(sale.paidAmount || 0).toLocaleString()}</span></div>
        ${(sale.balance || 0) > 0 ? `<div class="total-row bold"><span>Balance</span><span>${Number(sale.balance).toLocaleString()}</span></div>` : ""}
      </div>
      <div class="footer">Thank you!</div>
    </body>
  </html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

function shareWA(sale) {
  const lines = (sale.items || []).map((it, i) => 
    `${i + 1}. ${it.description} ${it.qty}×${Number(it.rate).toLocaleString()} = *${Number(it.amount).toLocaleString()}*`
  ).join("\n");
  
  const msg = `*${SHOP}*\n🧾 *Invoice ${sale.invoiceNo}*\n📅 ${fmtD(sale.invoiceDate)}\n👤 ${sale.customerName || "Counter Sale"}\n${"-".repeat(25)}\n${lines}\n${"-".repeat(25)}\n*Total: Rs. ${Number(sale.netTotal || 0).toLocaleString()}*\n_Thank you!_`;
  
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
}

export default function SaleHistoryPage() {
  const [sales, setSales] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selSale, setSelSale] = useState(null);
  const [selIdx, setSelIdx] = useState(-1);
  const [activeTab, setActiveTab] = useState("all");
  const [preset, setPreset] = useState("today");
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [search, setSearch] = useState("");
  const [payFilter, setPayFilter] = useState("");

  const searchRef = useRef(null);
  const tableRef = useRef(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    applyPreset("today");
  }, []);

  const applyPreset = (key) => {
    setPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (!p) return;
    setDateFrom(p.from());
    setDateTo(p.to());
    fetchData(p.from(), p.to(), search, activeTab, payFilter);
  };

  const fetchData = useCallback(async (from, to, q, tab, pay) => {
    setLoading(true);
    setSelSale(null);
    setSelIdx(-1);
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      if (q) params.set("search", q);
      if (pay) params.set("paymentMode", pay);
      
      const tabObj = TABS.find(t => t.key === tab);
      if (tabObj?.key === "return") params.set("saleType", "return");
      else if (tabObj?.src) params.set("saleSource", tabObj.src);
      else params.set("saleType", "sale");
      if (tab === "all") params.delete("saleType");
      
      const [salesRes, sumRes] = await Promise.all([
        api.get(`${EP.SALES.GET_ALL}?${params}`),
        api.get(`${EP.SALES.SUMMARY}?dateFrom=${from || ""}&dateTo=${to || ""}`)
      ]);
      
      if (salesRes.data.success) setSales(salesRes.data.data);
      if (sumRes.data.success) setSummary(sumRes.data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  const handleSearch = (v) => {
    setSearch(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => 
      fetchData(dateFrom, dateTo, v, activeTab, payFilter), 350
    );
  };

  const handleTabClick = (key) => {
    setActiveTab(key);
    setPayFilter("");
    fetchData(dateFrom, dateTo, search, key, "");
  };

  const handlePayFilter = (v) => {
    setPayFilter(v);
    fetchData(dateFrom, dateTo, search, activeTab, v);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this sale record?")) return;
    try {
      await api.delete(EP.SALES.DELETE(id));
      fetchData(dateFrom, dateTo, search, activeTab, payFilter);
    } catch {}
  };

  const tabCount = (key) => {
    if (!summary) return 0;
    return {
      all: (summary.all?.count || 0) + (summary.returns?.count || 0),
      debit: summary.debit?.count || 0,
      credit: summary.credit?.count || 0,
      cash: summary.cash?.count || 0,
      return: summary.returns?.count || 0,
    }[key] || 0;
  };

  const handleKey = (e) => {
    if (!sales.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const ni = Math.min(selIdx + 1, sales.length - 1);
      setSelIdx(ni);
      setSelSale(sales[ni]);
      tableRef.current?.querySelectorAll("tbody tr")[ni]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const ni = Math.max(selIdx - 1, 0);
      setSelIdx(ni);
      setSelSale(sales[ni]);
      tableRef.current?.querySelectorAll("tbody tr")[ni]?.scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter" && selSale) setSelSale(null);
    if (e.key === "Delete" && selSale) handleDelete(selSale._id);
    if ((e.key === "p" || e.key === "P") && selSale) printInvoice(selSale);
  };

  const s = summary;

  return (
    <div className="sh-page" tabIndex={0} onKeyDown={handleKey} style={{ background: "#fff", minHeight: "100vh" }}>
      {/* Top Bar */}
      <div className="sh-topbar" style={{ background: "#1a1a1a", padding: "8px 12px", borderBottom: "2px solid #000", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <div className="sh-title" style={{ color: "#fff", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}>
          {Ic.history} Sale History
        </div>

        <div className="sh-date-btns" style={{ display: "flex", gap: "4px" }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => applyPreset(p.key)} style={{
              padding: "4px 10px", fontSize: "11px", border: "1px solid #fff", background: preset === p.key ? "#fff" : "transparent",
              color: preset === p.key ? "#000" : "#fff", cursor: "pointer", borderRadius: "3px"
            }}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="sh-custom" style={{ display: "flex", alignItems: "center", gap: "6px", background: "#fff", padding: "3px 8px", borderRadius: "3px" }}>
          {Ic.cal}
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPreset("custom"); }} style={{ border: "none", padding: "3px", fontSize: "11px" }} />
          <span>–</span>
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPreset("custom"); }} style={{ border: "none", padding: "3px", fontSize: "11px" }} />
          <button onClick={() => fetchData(dateFrom, dateTo, search, activeTab, payFilter)} style={{ padding: "3px 8px", background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer", borderRadius: "3px", fontSize: "10px" }}>
            {Ic.filter} Apply
          </button>
        </div>

        <div className="sh-search-box" style={{ display: "flex", alignItems: "center", background: "#fff", borderRadius: "3px", padding: "3px 8px", flex: 1, minWidth: "200px" }}>
          <span style={{ marginRight: "5px" }}>{Ic.search}</span>
          <input ref={searchRef} value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Invoice / Customer..." style={{ border: "none", outline: "none", flex: 1, fontSize: "11px" }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sh-tabs" style={{ display: "flex", borderBottom: "1px solid #000", background: "#f5f5f5", padding: "0 10px" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => handleTabClick(t.key)} style={{
            padding: "8px 16px", fontSize: "12px", border: "none", background: activeTab === t.key ? "#fff" : "transparent",
            borderBottom: activeTab === t.key ? "2px solid #000" : "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: activeTab === t.key ? "bold" : "normal"
          }}>
            {t.key === "all" && Ic.list}
            {t.key === "debit" && Ic.cart}
            {t.key === "credit" && Ic.person}
            {t.key === "cash" && Ic.cash}
            {t.key === "return" && Ic.ret}
            {t.label}
            <span style={{ background: "#ddd", padding: "1px 5px", borderRadius: "10px", fontSize: "10px" }}>{tabCount(t.key)}</span>
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="sh-cards" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", padding: "10px", background: "#fff" }}>
        <div style={{ border: "1px solid #000", padding: "8px", background: "#fff" }}>
          <div style={{ fontSize: "10px", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>{Ic.bag} Total Sales</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#000" }}>Rs. {fmt(s?.all?.total || 0)}</div>
          <div style={{ fontSize: "9px", color: "#666" }}>{s?.all?.count || 0} invoices</div>
        </div>
        <div style={{ border: "1px solid #000", padding: "8px", background: "#fff" }}>
          <div style={{ fontSize: "10px", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>{Ic.cart} Debit</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#000" }}>Rs. {fmt(s?.debit?.total || 0)}</div>
          <div style={{ fontSize: "9px", color: "#666" }}>Due: Rs. {fmt(s?.debit?.balance || 0)}</div>
        </div>
        <div style={{ border: "1px solid #000", padding: "8px", background: "#fff" }}>
          <div style={{ fontSize: "10px", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>{Ic.person} Credit</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#000" }}>Rs. {fmt(s?.credit?.total || 0)}</div>
          <div style={{ fontSize: "9px", color: "#666" }}>Due: Rs. {fmt(s?.credit?.balance || 0)}</div>
        </div>
        <div style={{ border: "1px solid #000", padding: "8px", background: "#fff" }}>
          <div style={{ fontSize: "10px", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>{Ic.cash} Cash</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#000" }}>Rs. {fmt(s?.cash?.total || 0)}</div>
          <div style={{ fontSize: "9px", color: "#666" }}>{s?.cash?.count || 0} invoices</div>
        </div>
        <div style={{ border: "1px solid #000", padding: "8px", background: "#fff" }}>
          <div style={{ fontSize: "10px", color: "#000", display: "flex", alignItems: "center", gap: "4px" }}>{Ic.ret} Returns</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#000" }}>Rs. {fmt(s?.returns?.total || 0)}</div>
          <div style={{ fontSize: "9px", color: "#666" }}>{s?.returns?.count || 0} invoices</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="sh-filterbar" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 10px", borderTop: "1px solid #000", borderBottom: "1px solid #000", background: "#f5f5f5" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>{Ic.pay} Payment:</span>
        <select value={payFilter} onChange={(e) => handlePayFilter(e.target.value)} style={{ padding: "3px 6px", border: "1px solid #000", fontSize: "11px", background: "#fff" }}>
          <option value="">All</option>
          <option value="Cash">Cash</option>
          <option value="Credit">Credit</option>
          <option value="Bank">Bank</option>
        </select>
        {(payFilter || search) && (
          <button onClick={() => { setPayFilter(""); setSearch(""); fetchData(dateFrom, dateTo, "", activeTab, ""); }} style={{ padding: "3px 8px", border: "1px solid #000", background: "#fff", cursor: "pointer", fontSize: "10px" }}>
            {Ic.clear} Clear
          </button>
        )}
        <span style={{ fontSize: "10px", color: "#666", marginLeft: "auto" }}>
          {loading ? `${Ic.hourglass} Loading...` : `${Ic.list} ${sales.length} records | ↑↓ navigate | Enter=details | P=print`}
        </span>
      </div>

      {/* Table */}
      <div className="sh-table-wrap" ref={tableRef} style={{ overflowX: "auto", maxHeight: "calc(100vh - 350px)", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f5f5f5", borderBottom: "2px solid #000" }}>
            <tr>
              <th style={{ width: 35, padding: "6px 8px", textAlign: "center", border: "1px solid #000" }}>#</th>
              <th style={{ width: 100, padding: "6px 8px", textAlign: "left", border: "1px solid #000" }}>Invoice</th>
              <th style={{ width: 85, padding: "6px 8px", textAlign: "left", border: "1px solid #000" }}>Date</th>
              <th style={{ padding: "6px 8px", textAlign: "left", border: "1px solid #000" }}>Customer</th>
              <th style={{ width: 70, padding: "6px 8px", textAlign: "left", border: "1px solid #000" }}>Source</th>
              <th style={{ width: 75, padding: "6px 8px", textAlign: "left", border: "1px solid #000" }}>Payment</th>
              <th style={{ width: 45, padding: "6px 8px", textAlign: "center", border: "1px solid #000" }}>Items</th>
              <th style={{ width: 95, padding: "6px 8px", textAlign: "right", border: "1px solid #000" }}>Net Total</th>
              <th style={{ width: 85, padding: "6px 8px", textAlign: "right", border: "1px solid #000" }}>Paid</th>
              <th style={{ width: 85, padding: "6px 8px", textAlign: "right", border: "1px solid #000" }}>Balance</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="10" style={{ textAlign: "center", padding: "30px" }}>{Ic.hourglass} Loading...</td></tr>}
            {!loading && sales.length === 0 && <tr><td colSpan="10" style={{ textAlign: "center", padding: "30px" }}>{Ic.inbox} No records found</td></tr>}
            {sales.map((sale, i) => (
              <tr key={sale._id} onClick={() => { setSelSale(sale); setSelIdx(i); }} style={{
                cursor: "pointer", background: selSale?._id === sale._id ? "#e3f2fd" : (i % 2 === 0 ? "#fff" : "#f9f9f9"),
                borderBottom: "1px solid #ddd"
              }}>
                <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #ddd", color: "#999" }}>{i + 1}</td>
                <td style={{ padding: "6px 8px", fontWeight: "bold", border: "1px solid #ddd" }}>{sale.invoiceNo}</td>
                <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>{fmtD(sale.invoiceDate)}</td>
                <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>{sale.customerName || "COUNTER SALE"}</td>
                <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>
                  <span style={{ padding: "2px 6px", background: sale.saleSource === "debit" ? "#dc2626" : sale.saleSource === "credit" ? "#f59e0b" : "#10b981", color: "#fff", borderRadius: "3px", fontSize: "10px" }}>
                    {sale.saleSource === "debit" ? "Debit" : sale.saleSource === "credit" ? "Credit" : "Cash"}
                  </span>
                </td>
                <td style={{ padding: "6px 8px", border: "1px solid #ddd" }}>{sale.paymentMode}</td>
                <td style={{ padding: "6px 8px", textAlign: "center", border: "1px solid #ddd" }}>{(sale.items || []).length}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", border: "1px solid #ddd" }}>{fmt(sale.netTotal)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", color: "#10b981", border: "1px solid #ddd" }}>{fmt(sale.paidAmount)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", color: (sale.balance || 0) > 0 ? "#dc2626" : "#10b981", border: "1px solid #ddd" }}>{fmt(sale.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {selSale && (
        <div style={{ borderTop: "2px solid #000", background: "#fff", marginTop: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", background: "#f5f5f5", borderBottom: "1px solid #000" }}>
            <div style={{ display: "flex", gap: "15px", alignItems: "center", fontSize: "12px" }}>
              <span style={{ fontWeight: "bold" }}>{Ic.receipt} {selSale.invoiceNo}</span>
              <span>{Ic.person} {selSale.customerName || "Counter Sale"}</span>
              <span>{Ic.cal} {fmtD(selSale.invoiceDate)}</span>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => printInvoice(selSale)} style={{ padding: "4px 10px", background: "#1a1a1a", color: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>{Ic.print} Print</button>
              <button onClick={() => shareWA(selSale)} style={{ padding: "4px 10px", background: "#25D366", color: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>{Ic.wa} WhatsApp</button>
              <button onClick={() => handleDelete(selSale._id)} style={{ padding: "4px 10px", background: "#dc2626", color: "#fff", border: "1px solid #000", cursor: "pointer", fontSize: "11px" }}>{Ic.trash} Delete</button>
              <button onClick={() => setSelSale(null)} style={{ padding: "4px 10px", background: "#f5f5f5", border: "1px solid #000", cursor: "pointer" }}>{Ic.close}</button>
            </div>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #000" }}>
                <th style={{ width: 35, padding: "6px", border: "1px solid #ddd" }}>#</th>
                <th style={{ padding: "6px", border: "1px solid #ddd" }}>Description</th>
                <th style={{ width: 70, padding: "6px", border: "1px solid #ddd" }}>Meas.</th>
                <th style={{ width: 50, padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>Qty</th>
                <th style={{ width: 80, padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>Rate</th>
                <th style={{ width: 60, padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>Disc%</th>
                <th style={{ width: 90, padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {(selSale.items || []).map((it, i) => (
                <tr key={i}>
                  <td style={{ padding: "6px", textAlign: "center", border: "1px solid #ddd" }}>{i + 1}</td>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>{it.description}</td>
                  <td style={{ padding: "6px", border: "1px solid #ddd" }}>{it.measurement || "—"}</td>
                  <td style={{ padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>{it.qty}</td>
                  <td style={{ padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>{fmt(it.rate)}</td>
                  <td style={{ padding: "6px", textAlign: "right", border: "1px solid #ddd" }}>{it.disc || 0}%</td>
                  <td style={{ padding: "6px", textAlign: "right", fontWeight: "bold", border: "1px solid #ddd" }}>{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ padding: "10px", borderTop: "1px solid #ddd", display: "flex", justifyContent: "flex-end", gap: "15px" }}>
            <div><span style={{ fontWeight: "bold" }}>Sub Total:</span> {fmt(selSale.subTotal)}</div>
            {(selSale.discAmount || 0) > 0 && <div><span style={{ fontWeight: "bold" }}>Discount:</span> -{fmt(selSale.discAmount)}</div>}
            <div><span style={{ fontWeight: "bold" }}>Net Total:</span> {fmt(selSale.netTotal)}</div>
            <div><span style={{ fontWeight: "bold" }}>Paid:</span> {fmt(selSale.paidAmount)}</div>
            {(selSale.balance || 0) > 0 && <div><span style={{ fontWeight: "bold", color: "#dc2626" }}>Balance:</span> {fmt(selSale.balance)}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
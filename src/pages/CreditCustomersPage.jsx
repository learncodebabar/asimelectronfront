// pages/CreditCustomersPage.jsx
import React, { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api.js";
import EP from "../api/apiEndpoints.js";
import "../styles/theme.css";
import "../styles/CreditCustomersPage.css";
import { SHOP_INFO, URDU_FONT, GOOGLE_FONT_LINK, getShopHeaderHTML, getShopBannerHTML, getShopTermsHTML, getShopFooterHTML } from "../constants/shopInfo.js";

const fmt = (n) => Number(n || 0).toLocaleString("en-PK");
const isoD = () => new Date().toISOString().split("T")[0];

// Build Complete Customer Statement HTML for Print (Full with Items - Items in same cell with labels)
const buildCustomerStatementHtml = (customer, sales, rawPurchases, payments) => {
  const totalSales = sales.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPaid = sales.reduce((s, x) => s + (x.paidAmount || 0), 0);
  const totalRaw = rawPurchases.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding = customer.currentBalance || 0;
  
  // Build detailed invoice rows with items in same cell
  const allInvoices = [...sales, ...rawPurchases].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  
  let invoiceRows = "";
  let counter = 1;
  
  allInvoices.forEach((inv) => {
    // Build items HTML
    let itemsHtml = "";
    if (inv.items && inv.items.length > 0) {
      itemsHtml = `<div style="margin-top: 6px;">
        <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 3px 4px; border: 1px solid #ccc; text-align: left;">Item</th>
              <th style="padding: 3px 4px; border: 1px solid #ccc; text-align: center; width: 45px;">Qty</th>
              <th style="padding: 3px 4px; border: 1px solid #ccc; text-align: right; width: 65px;">Rate</th>
              <th style="padding: 3px 4px; border: 1px solid #ccc; text-align: right; width: 75px;">Amount</th>
              <th style="padding: 3px 4px; border: 1px solid #ccc; text-align: center; width: 40px;">Rack</th>
              <th style="padding: 3px 4px; border: 1px solid #ccc; text-align: center; width: 45px;">UOM</th>
             </tr>
          </thead>
          <tbody>`;
      
      inv.items.forEach((it, idx) => {
        itemsHtml += `
          <tr>
            <td style="padding: 3px 4px; border: 1px solid #ccc;">${idx + 1}. ${it.description || it.name || "—"} ${it.code ? `(${it.code})` : ""}</td>
            <td style="padding: 3px 4px; border: 1px solid #ccc; text-align: center;">${it.qty || it.pcs || 0}</td>
            <td style="padding: 3px 4px; border: 1px solid #ccc; text-align: right;">${fmt(it.rate || 0)}</td>
            <td style="padding: 3px 4px; border: 1px solid #ccc; text-align: right; font-weight: bold;">${fmt(it.amount || 0)}</td>
            <td style="padding: 3px 4px; border: 1px solid #ccc; text-align: center;">${it.rack || "—"}</td>
            <td style="padding: 3px 4px; border: 1px solid #ccc; text-align: center;">${it.measurement || it.uom || "—"}</td>
          </tr>
        `;
      });
      
      itemsHtml += `
          </tbody>
        </table>
      </div>`;
    }
    
    // Main invoice row
    invoiceRows += `
      <tr>
        <td style="padding: 10px 8px; border: 2px solid #000000; font-size: 13px; font-weight: bold; text-align: center; vertical-align: top;">${counter}</td>
        <td style="padding: 10px 8px; border: 2px solid #000000; font-size: 13px; font-weight: bold; vertical-align: top;">${inv.invoiceDate}</td>
        <td style="padding: 10px 8px; border: 2px solid #000000; font-size: 13px; font-weight: bold; text-transform: uppercase; vertical-align: top;">${inv.invoiceNo}</td>
        <td style="padding: 10px 8px; border: 2px solid #000000; text-align: right; font-size: 13px; font-weight: bold; vertical-align: top;">${fmt(inv.netTotal)}</td>
        <td style="padding: 10px 8px; border: 2px solid #000000; text-align: right; font-size: 13px; font-weight: bold; color: #059669; vertical-align: top;">${fmt(inv.paidAmount)}</td>
        <td style="padding: 10px 8px; border: 2px solid #000000; font-size: 11px; vertical-align: top;">
          ${itemsHtml}
        </td>
        <td style="padding: 10px 8px; border: 2px solid #000000; text-align: right; font-size: 13px; font-weight: bold; color: ${inv.balance > 0 ? '#dc2626' : '#059669'}; vertical-align: top;">${fmt(inv.balance)}</td>
      </tr>
    `;
    
    // Add remarks row if there are remarks
    if (inv.remarks && inv.remarks.trim()) {
      invoiceRows += `
        <tr style="background: #fef9e6;">
          <td colspan="3" style="padding: 6px 8px; border: 1px solid #000000; font-size: 11px; font-weight: bold; text-align: right;">📝 Remarks:</td>
          <td colspan="4" style="padding: 6px 8px; border: 1px solid #000000; font-size: 11px;">${inv.remarks}</td>
        </tr>
      `;
    }
    
    counter++;
  });
  
  const paymentRows = payments.map((p, i) => `
    <tr>
      <td style="padding: 8px; border: 2px solid #000000; font-size: 12px; text-align: center;">${i + 1}</td>
      <td style="padding: 8px; border: 2px solid #000000; font-size: 12px;">${p.paymentDate || p.createdAt?.split("T")[0]}</td>
      <td style="padding: 8px; border: 2px solid #000000; text-align: right; font-size: 12px; font-weight: bold;">${fmt(p.amount)}</td>
      <td style="padding: 8px; border: 2px solid #000000; font-size: 12px;">${p.remarks || "—"}</td>
    </tr>
  `).join("");
  
  const printDateTime = new Date().toLocaleString("en-PK", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Customer Statement - ${customer.name}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px;background:#fff}
      
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 3px solid #000000;
      }
      .shop-section {
        text-align: left;
        flex: 2;
      }
      .customer-section {
        text-align: right;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 15px;
      }
      .shop-name{font-size:20px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:5px}
      .shop-name-en{font-size:14px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
      .shop-addr{font-size:10px;color:#000;margin:2px 0}
      .print-time{font-size:9px;color:#555;margin-top:5px}
      .customer-photo-small{width:60px;height:60px;object-fit:cover;border:2px solid #000000}
      .customer-name{font-size:16px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
      .customer-phone{font-size:12px;color:#000}
      .customer-code{font-size:11px;color:#555}
      
      .section-title{font-size:14px;font-weight:bold;margin:15px 0 10px;padding:8px;background:#000000;color:#ffffff;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th{background:#333333;color:#ffffff;padding:10px 8px;font-size:12px;border:2px solid #000000;text-transform:uppercase;font-weight:bold}
      td{padding:8px;border:1px solid #000000;font-size:12px;vertical-align:top}
      .footer{text-align:center;margin-top:25px;padding-top:10px;border-top:1px solid #000000;font-size:9px;color:#555}
      .text-center{text-align:center}
      .text-right{text-align:right}
      .red{color:#dc2626}
      .green{color:#059669}
      @media print{
        body{padding:8mm}
        .print-header{margin-bottom:15px}
        th,td{padding:6px}
      }
    </style>
  </head>
  <body>
    <div class="print-header">
      <div class="shop-section">
        <div class="shop-name">${SHOP_INFO.name}</div>
        <div class="shop-name-en">${SHOP_INFO.nameEn}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-addr">Ph: ${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
        <div class="print-time">Printed on: ${printDateTime}</div>
      </div>
      <div class="customer-section">
        ${customer.imageFront ? 
          `<img src="${customer.imageFront}" class="customer-photo-small" alt="${customer.name}">` : 
          `<div style="width:60px;height:60px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:30px;border:2px solid #000">👤</div>`
        }
        <div>
          <div class="customer-name">${customer.name}</div>
          <div class="customer-phone">📞 ${customer.phone || "N/A"}</div>
          <div class="customer-code">🆔 ${customer.code || "N/A"}</div>
          <div class="customer-code">📍 ${customer.address || ""} ${customer.area ? `(${customer.area})` : ""}</div>
          <div class="customer-code">📅 Statement Date: ${isoD()}</div>
        </div>
      </div>
    </div>
    
    <div class="section-title">💰 INVOICES (WITH ITEMS DETAILS)</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>DATE</th>
          <th>INVOICE NO</th>
          <th class="text-right">TOTAL</th>
          <th class="text-right">PAID</th>
          <th>ITEMS</th>
          <th class="text-right">BALANCE</th>
        </tr>
      </thead>
      <tbody>${invoiceRows}</tbody>
    </table>
    
    ${payments.length > 0 ? `
    <div class="section-title">💳 PAYMENT HISTORY</div>
    <table>
      <thead>
        <tr><th style="width:40px">#</th><th>DATE</th><th class="text-right">AMOUNT</th><th>REMARKS</th></tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>` : ""}
    
    <div class="footer">${SHOP_INFO.devBy}</div>
  </body>
  </html>`;
};

// Build Simple Statement HTML for Print (Only Invoice Summary - No Items)
const buildSimpleStatementHtml = (customer, sales, rawPurchases, payments) => {
  const totalSales = sales.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPaid = sales.reduce((s, x) => s + (x.paidAmount || 0), 0);
  const totalRaw = rawPurchases.reduce((s, x) => s + (x.netTotal || 0), 0);
  const totalPayments = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const outstanding = customer.currentBalance || 0;
  
  const allInvoices = [...sales, ...rawPurchases].sort((a, b) => new Date(b.invoiceDate) - new Date(a.invoiceDate));
  
  let invoiceRows = "";
  let counter = 1;
  
  allInvoices.forEach((inv) => {
    invoiceRows += `
      <tr>
        <td style="padding:10px 8px;border:2px solid #000000;font-size:13px;font-weight:bold;text-align:center">${counter}</td>
        <td style="padding:10px 8px;border:2px solid #000000;font-size:13px;font-weight:bold;text-transform:uppercase">${inv.invoiceNo}</td>
        <td style="padding:10px 8px;border:2px solid #000000;font-size:13px;font-weight:bold">${inv.invoiceDate}</td>
        <td style="padding:10px 8px;border:2px solid #000000;text-align:right;font-size:13px;font-weight:bold">PKR ${fmt(inv.netTotal)}</td>
        <td style="padding:10px 8px;border:2px solid #000000;text-align:right;font-size:13px;font-weight:bold">PKR ${fmt(inv.paidAmount)}</td>
        <td style="padding:10px 8px;border:2px solid #000000;text-align:right;font-size:13px;font-weight:bold">PKR ${fmt(inv.balance)}</td>
      </tr>
    `;
    counter++;
  });
  
  const paymentRows = payments.map((p, i) => `
    <tr>
      <td style="padding:8px;border:2px solid #000000;font-size:12px;text-align:center">${i + 1}</td>
      <td style="padding:8px;border:2px solid #000000;font-size:12px">${p.paymentDate || p.createdAt?.split("T")[0]}</td>
      <td style="padding:8px;border:2px solid #000000;text-align:right;font-size:12px;font-weight:bold">PKR ${fmt(p.amount)}</td>
      <td style="padding:8px;border:2px solid #000000;font-size:12px">${p.remarks || "—"}</td>
    </tr>
  `).join("");
  
  const printDateTime = new Date().toLocaleString("en-PK", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Customer Statement (Simple) - ${customer.name}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:20px;font-size:12px;background:#fff}
      
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 3px solid #000000;
      }
      .shop-section {
        text-align: left;
        flex: 2;
      }
      .customer-section {
        text-align: right;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 15px;
      }
      .shop-name{font-size:20px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:5px}
      .shop-name-en{font-size:14px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
      .shop-addr{font-size:10px;color:#000;margin:2px 0}
      .print-time{font-size:9px;color:#555;margin-top:5px}
      .customer-photo-small{width:60px;height:60px;object-fit:cover;border:2px solid #000000}
      .customer-name{font-size:16px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
      .customer-phone{font-size:12px;color:#000}
      .customer-code{font-size:11px;color:#555}
      
      .section-title{font-size:14px;font-weight:bold;margin:15px 0 10px;padding:8px;background:#000000;color:#ffffff;text-transform:uppercase}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th{background:#333333;color:#ffffff;padding:10px 8px;font-size:12px;border:2px solid #000000;text-transform:uppercase;font-weight:bold}
      td{padding:8px;border:1px solid #000000;font-size:12px}
      .totals{width:350px;margin-left:auto;margin-top:15px}
      .totals-row{display:flex;justify-content:space-between;padding:6px 0;font-size:12px}
      .totals-row.bold{font-weight:bold;border-top:2px solid #000000;margin-top:5px;padding-top:8px;font-size:14px}
      .footer{text-align:center;margin-top:25px;padding-top:10px;border-top:1px solid #000000;font-size:9px;color:#555}
      .text-center{text-align:center}
      .text-right{text-align:right}
      .red{color:#dc2626}
      .green{color:#059669}
      .statement-note {
        text-align: center;
        font-size: 10px;
        color: #555;
        margin: 10px 0;
        font-style: italic;
      }
      @media print{
        body{padding:8mm}
        .print-header{margin-bottom:15px}
        th,td{padding:6px}
      }
    </style>
  </head>
  <body>
    <div class="print-header">
      <div class="shop-section">
        <div class="shop-name">${SHOP_INFO.name}</div>
        <div class="shop-name-en">${SHOP_INFO.nameEn}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-addr">Ph: ${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
        <div class="print-time">Printed on: ${printDateTime}</div>
      </div>
      <div class="customer-section">
        ${customer.imageFront ? 
          `<img src="${customer.imageFront}" class="customer-photo-small" alt="${customer.name}">` : 
          `<div style="width:60px;height:60px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:30px;border:2px solid #000">👤</div>`
        }
        <div>
          <div class="customer-name">${customer.name}</div>
          <div class="customer-phone">📞 ${customer.phone || "N/A"}</div>
          <div class="customer-code">🆔 ${customer.code || "N/A"}</div>
          <div class="customer-code">📍 ${customer.address || ""} ${customer.area ? `(${customer.area})` : ""}</div>
          <div class="customer-code">📅 Statement Date: ${isoD()}</div>
        </div>
      </div>
    </div>
    
    <div class="statement-note">📋 SIMPLE STATEMENT - INVOICE SUMMARY ONLY</div>
    
    <div class="section-title">💰 INVOICE SUMMARY</div>
    <table>
      <thead>
        <tr>
          <th style="width:40px">#</th>
          <th>INVOICE NO</th>
          <th>DATE</th>
          <th class="text-right">TOTAL</th>
          <th class="text-right">PAID</th>
          <th class="text-right">BALANCE</th>
        </tr>
      </thead>
      <tbody>${invoiceRows}</tbody>
    </table>
    
    ${payments.length > 0 ? `
    <div class="section-title">💳 PAYMENT HISTORY</div>
    <table>
      <thead>
        <tr><th style="width:40px">#</th><th>DATE</th><th class="text-right">AMOUNT</th><th>REMARKS</th></tr>
      </thead>
      <tbody>${paymentRows}</tbody>
    </table>` : ""}
    
    <div class="totals">
      <div class="totals-row"><span>TOTAL SALES:</span><span>PKR ${fmt(totalSales)}</span></div>
      <div class="totals-row"><span>RAW PURCHASES:</span><span>PKR ${fmt(totalRaw)}</span></div>
      <div class="totals-row"><span>TOTAL PAID:</span><span>PKR ${fmt(totalPaid + totalPayments)}</span></div>
      <div class="totals-row bold"><span>OUTSTANDING BALANCE:</span><span class="red">PKR ${fmt(outstanding)}</span></div>
    </div>
    
    <div class="footer">${SHOP_INFO.devBy}</div>
  </body>
  </html>`;
};

// Build Single Invoice HTML for Print
const buildInvoiceHtml = (invoice, customer) => {
  const rows = invoice.items?.map((it, i) => ({ ...it, sr: i + 1 })) || [];
  
  const itemRows = rows.map(it => `
    <tr>
      <td style="padding:8px 6px;border:2px solid #000000;font-size:11px;text-align:center">${it.sr}</td>
      <td style="padding:8px 6px;border:2px solid #000000;font-size:11px">${it.description || it.name}</td>
      <td style="padding:8px 6px;border:2px solid #000000;text-align:right;font-size:11px">${it.qty || it.pcs || 0} ${it.measurement || it.uom || ""}</td>
      <td style="padding:8px 6px;border:2px solid #000000;text-align:right;font-size:11px">PKR ${fmt(it.rate || 0)}</td>
      <td style="padding:8px 6px;border:2px solid #000000;text-align:right;font-size:11px">PKR ${fmt(it.amount || 0)}</td>
    </tr>
  `).join("");
  
  const printDateTime = new Date().toLocaleString("en-PK", {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.invoiceNo}</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:15px;font-size:11px;background:#fff}
      
      .print-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #000000;
      }
      .shop-section {
        text-align: left;
        flex: 2;
      }
      .customer-section {
        text-align: right;
        flex: 1;
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
      }
      .shop-name{font-size:18px;font-weight:bold;font-family:${URDU_FONT};margin-bottom:3px}
      .shop-name-en{font-size:12px;font-weight:bold;margin-bottom:3px;text-transform:uppercase}
      .shop-addr{font-size:9px;color:#000;margin:1px 0}
      .print-time{font-size:8px;color:#555;margin-top:3px}
      .customer-photo-small{width:50px;height:50px;object-fit:cover;border:2px solid #000000}
      .customer-name{font-size:14px;font-weight:bold;margin-bottom:3px;text-transform:uppercase}
      .customer-phone{font-size:10px;color:#000}
      
      .invoice-title{font-size:16px;font-weight:bold;margin:12px 0;padding:8px;background:#000000;color:#ffffff;text-align:center;text-transform:uppercase}
      .info-row{display:flex;justify-content:space-between;margin:10px 0;padding:8px;background:#f5f5f5;border:1px solid #000000;font-size:11px}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th{background:#333333;color:#ffffff;padding:8px 6px;font-size:11px;border:2px solid #000000;text-transform:uppercase;font-weight:bold}
      td{padding:6px;border:1px solid #000000;font-size:10px}
      .totals{width:300px;margin-left:auto;margin-top:12px}
      .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:11px}
      .totals-row.bold{font-weight:bold;border-top:2px solid #000000;margin-top:5px;padding-top:8px;font-size:13px}
      .footer{text-align:center;margin-top:18px;padding-top:8px;border-top:1px solid #000000;font-size:8px;color:#555}
      .text-right{text-align:right}
      .red{color:#dc2626}
      .green{color:#059669}
      @media print{body{padding:5mm}}
    </style>
  </head>
  <body>
    <div class="print-header">
      <div class="shop-section">
        <div class="shop-name">${SHOP_INFO.name}</div>
        <div class="shop-name-en">${SHOP_INFO.nameEn}</div>
        <div class="shop-addr">${SHOP_INFO.address}</div>
        <div class="shop-addr">Ph: ${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}</div>
        <div class="print-time">Printed on: ${printDateTime}</div>
      </div>
      <div class="customer-section">
        ${customer.imageFront ? 
          `<img src="${customer.imageFront}" class="customer-photo-small" alt="${customer.name}">` : 
          `<div style="width:50px;height:50px;background:#ddd;display:flex;align-items:center;justify-content:center;font-size:25px;border:2px solid #000">👤</div>`
        }
        <div>
          <div class="customer-name">${customer.name}</div>
          <div class="customer-phone">📞 ${customer.phone || "N/A"}</div>
        </div>
      </div>
    </div>
    
    <div class="invoice-title">${invoice.saleType === "raw-purchase" ? "RAW PURCHASE INVOICE" : "SALES INVOICE"}</div>
    <div class="info-row">
      <span><strong>INVOICE NO:</strong> ${invoice.invoiceNo}</span>
      <span><strong>DATE:</strong> ${invoice.invoiceDate}</span>
    </div>
    <div class="info-row">
      <span><strong>CUSTOMER:</strong> ${customer.name}</span>
      <span><strong>PHONE:</strong> ${customer.phone || ""}</span>
    </div>
    <table>
      <thead>
        <tr><th style="width:35px">#</th><th>DESCRIPTION</th><th class="text-right">QTY</th><th class="text-right">RATE</th><th class="text-right">AMOUNT</th></tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>
    <div class="totals">
      <div class="totals-row"><span>SUB TOTAL:</span><span>PKR ${fmt(invoice.subTotal || 0)}</span></div>
      ${invoice.extraDisc > 0 ? `<div class="totals-row"><span>DISCOUNT:</span><span>PKR ${fmt(invoice.extraDisc)}</span></div>` : ""}
      <div class="totals-row bold"><span>NET TOTAL:</span><span>PKR ${fmt(invoice.netTotal || 0)}</span></div>
      ${invoice.prevBalance > 0 ? `<div class="totals-row"><span>PREVIOUS BALANCE:</span><span>PKR ${fmt(invoice.prevBalance)}</span></div>` : ""}
      <div class="totals-row"><span>PAID:</span><span>PKR ${fmt(invoice.paidAmount || 0)}</span></div>
      <div class="totals-row bold ${(invoice.balance || 0) > 0 ? 'red' : 'green'}"><span>BALANCE:</span><span>PKR ${fmt(invoice.balance || 0)}</span></div>
    </div>
    <div class="footer">${SHOP_INFO.devBy}</div>
  </body>
  </html>`;
};

// Print Functions
const printFullCustomerStatement = (customer, sales, rawPurchases, payments) => {
  const html = buildCustomerStatementHtml(customer, sales, rawPurchases, payments);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

const printSimpleCustomerStatement = (customer, sales, rawPurchases, payments) => {
  const html = buildSimpleStatementHtml(customer, sales, rawPurchases, payments);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

const shareCustomerStatement = async (customer, sales, rawPurchases, payments) => {
  const phone = customer.phone?.replace(/\D/g, "");
  if (!phone) {
    alert("No phone number available");
    return;
  }
  const html = buildCustomerStatementHtml(customer, sales, rawPurchases, payments);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Customer Statement - ${customer.name}`)}`, '_blank');
        }, 1000);
      }, 500);
    };
  }
};

const printInvoice = (invoice, customer) => {
  const html = buildInvoiceHtml(invoice, customer);
  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 500);
};

const shareInvoice = async (invoice, customer) => {
  const phone = customer.phone?.replace(/\D/g, "");
  if (!phone) {
    alert("No phone number available");
    return;
  }
  const html = buildInvoiceHtml(invoice, customer);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
        setTimeout(() => {
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Invoice ${invoice.invoiceNo} - ${customer.name}`)}`, '_blank');
        }, 1000);
      }, 500);
    };
  }
};

/* ═══════════════════════════════════════════════════════════
   CUSTOMER DETAIL PAGE - Shows all customer details, invoices, payments
════════════════════════════════════════════════════════════ */
function CustomerDetailPage({ customer, onBack }) {
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rawPurchases, setRawPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [expandedInvoices, setExpandedInvoices] = useState({});
  const [expandAll, setExpandAll] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [customer._id]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const salesRes = await api.get(EP.CUSTOMERS.SALE_HISTORY(customer._id));
      if (salesRes.data.success) {
        setSales(Array.isArray(salesRes.data.data) ? salesRes.data.data : []);
      } else {
        setSales([]);
      }
      
      try {
        const paymentsRes = await api.get(`/payments/customer/${customer._id}`);
        if (paymentsRes.data.success) {
          setPayments(Array.isArray(paymentsRes.data.data) ? paymentsRes.data.data : []);
        } else {
          setPayments([]);
        }
      } catch (err) {
        setPayments([]);
      }
      
      try {
        const rawPurchasesRes = await api.get(`${EP.RAW_PURCHASES.GET_ALL}?customerId=${customer._id}`);
        if (rawPurchasesRes.data.success) {
          setRawPurchases(Array.isArray(rawPurchasesRes.data.data) ? rawPurchasesRes.data.data : []);
        } else {
          setRawPurchases([]);
        }
      } catch (err) {
        setRawPurchases([]);
      }
    } catch (err) {
      console.error("Failed to load customer data:", err);
      setSales([]);
      setPayments([]);
      setRawPurchases([]);
    }
    setLoading(false);
  };

  const toggleInvoiceExpand = (invoiceId) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  const toggleExpandAll = () => {
    const newExpandAll = !expandAll;
    setExpandAll(newExpandAll);
    const allInvoiceIds = [...sales, ...rawPurchases].map(inv => inv._id);
    const newExpandedState = {};
    if (newExpandAll) {
      allInvoiceIds.forEach(id => { newExpandedState[id] = true; });
    }
    setExpandedInvoices(newExpandedState);
  };

  const totalSales = Array.isArray(sales) ? sales.reduce((s, x) => s + (x.netTotal || 0), 0) : 0;
  const totalPaid = Array.isArray(sales) ? sales.reduce((s, x) => s + (x.paidAmount || 0), 0) : 0;
  const totalRawPurchases = Array.isArray(rawPurchases) ? rawPurchases.reduce((s, x) => s + (x.netTotal || 0), 0) : 0;
  const totalPayments = Array.isArray(payments) ? payments.reduce((s, p) => s + (p.amount || 0), 0) : 0;
  const outstanding = customer.currentBalance || 0;

  const allTransactions = [
    ...(Array.isArray(sales) ? sales.map(s => ({ ...s, type: "sale", date: s.invoiceDate })) : []),
    ...(Array.isArray(rawPurchases) ? rawPurchases.map(r => ({ ...r, type: "raw-purchase", date: r.invoiceDate })) : []),
    ...(Array.isArray(payments) ? payments.map(p => ({ ...p, type: "payment", date: p.paymentDate || p.createdAt?.split("T")[0], amount: p.amount })) : [])
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleFullDetails = () => {
    setTimeout(() => {
      printFullCustomerStatement(customer, sales, rawPurchases, payments);
    }, 100);
  };

  const handleSimpleStatement = () => {
    setTimeout(() => {
      printSimpleCustomerStatement(customer, sales, rawPurchases, payments);
    }, 100);
  };

  // Render invoice items in same cell with labels (like General Ledger)
  const renderInvoiceItems = (invoice) => {
    const items = invoice.items || [];
    if (items.length === 0) return null;
    
    return (
      <tr className="invoice-details-row">
        <td colSpan="8" style={{ padding: "12px", background: "#fafafa", border: "2px solid #000000" }}>
          <div style={{ fontWeight: "bold", fontSize: "11px", marginBottom: "8px", color: "#1e40af" }}>📋 ITEMS DETAILS:</div>
          <table style={{ width: "100%", fontSize: "11px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#e0e0e0" }}>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "left", fontSize: "10px", fontWeight: "bold" }}>#</th>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "left", fontSize: "10px", fontWeight: "bold" }}>Product</th>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "center", fontSize: "10px", fontWeight: "bold", width: "60px" }}>Qty</th>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "right", fontSize: "10px", fontWeight: "bold", width: "80px" }}>Rate</th>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "right", fontSize: "10px", fontWeight: "bold", width: "90px" }}>Amount</th>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "center", fontSize: "10px", fontWeight: "bold", width: "50px" }}>Rack</th>
                <th style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "center", fontSize: "10px", fontWeight: "bold", width: "55px" }}>UOM</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px", textAlign: "center" }}>{idx + 1}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px" }}>
                    <strong>{it.description || it.name}</strong>
                    {it.code && <div style={{ fontSize: "9px", color: "#666" }}>Code: {it.code}</div>}
                  </td>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px", textAlign: "center" }}>{it.qty || it.pcs || 0} {it.measurement || it.uom || ""}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px", textAlign: "right" }}>PKR {fmt(it.rate || 0)}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(it.amount || 0)}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px", textAlign: "center" }}>{it.rack || "—"}</td>
                  <td style={{ padding: "5px 8px", border: "1px solid #000000", fontSize: "11px", textAlign: "center" }}>{it.measurement || it.uom || "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f5f5f5", fontWeight: "bold" }}>
                <td colSpan="4" style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "right" }}>TOTAL:</td>
                <td style={{ padding: "6px 8px", border: "1px solid #000000", textAlign: "right", fontWeight: "bold" }}>PKR {fmt(items.reduce((sum, it) => sum + (it.amount || 0), 0))}</td>
                <td colSpan="2" style={{ padding: "6px 8px", border: "1px solid #000000" }}></td>
              </tr>
            </tfoot>
          </table>
        </td>
      </tr>
    );
  };

  return (
    <div className="cp-customer-detail-page" style={{ padding: "16px", height: "100%", overflow: "auto", background: "#ffffff" }}>
      {/* Header with Customer Photo */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px", padding: "16px", background: "#1e40af", borderRadius: "12px", flexWrap: "wrap" }}>
        <button className="xp-btn xp-btn-sm" style={{ background: "#ffffff", color: "#1e40af", border: "2px solid #000000", fontWeight: "bold" }} onClick={onBack}>← Back to List</button>
        <div style={{ width: "70px", height: "70px", borderRadius: "50%", overflow: "hidden", background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", border: "3px solid #ffffff", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }}>
          {customer.imageFront ? (
            <img src={customer.imageFront} alt={customer.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <div style={{ fontSize: "40px" }}>👤</div>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: "0 0 8px 0", color: "#ffffff", fontSize: "18px" }}>{customer.name}</h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {customer.code && <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", color: "#ffffff" }}>Code: {customer.code}</span>}
            {customer.phone && <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", color: "#ffffff" }}>📞 {customer.phone}</span>}
            {customer.area && <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", color: "#ffffff" }}>📍 {customer.area}</span>}
            {customer.address && <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", color: "#ffffff" }}>🏠 {customer.address}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button className="xp-btn xp-btn-primary" style={{ background: "#ffffff", color: "#1e40af", border: "2px solid #000000", fontWeight: "bold" }} onClick={handleFullDetails}>📄 Full Statement</button>
          <button className="xp-btn" style={{ background: "#e5e7eb", color: "#000000", border: "2px solid #000000", fontWeight: "bold" }} onClick={handleSimpleStatement}>📋 Simple Statement</button>
          <button className="xp-btn" style={{ background: "#25D366", color: "#ffffff", border: "2px solid #000000", fontWeight: "bold" }} onClick={() => shareCustomerStatement(customer, sales, rawPurchases, payments)}>📱 Share Statement</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Sales</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>PKR {fmt(totalSales)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Paid</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#059669" }}>PKR {fmt(totalPaid + totalPayments)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Raw Purchases</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>PKR {fmt(totalRawPurchases)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Outstanding</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#dc2626" }}>PKR {fmt(outstanding)}</div>
        </div>
        <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Transactions</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>{allTransactions.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "2px", marginBottom: "16px", borderBottom: "2px solid #000000" }}>
        <button className={`xp-tab${activeTab === "invoices" ? " active" : ""}`} style={{ padding: "10px 20px", background: activeTab === "invoices" ? "#000000" : "#f0f0f0", color: activeTab === "invoices" ? "#ffffff" : "#000000", border: "2px solid #000000", borderBottom: "none", fontWeight: "bold", cursor: "pointer" }} onClick={() => setActiveTab("invoices")}>📋 Invoices ({(sales.length || 0) + (rawPurchases.length || 0)})</button>
        <button className={`xp-tab${activeTab === "payments" ? " active" : ""}`} style={{ padding: "10px 20px", background: activeTab === "payments" ? "#000000" : "#f0f0f0", color: activeTab === "payments" ? "#ffffff" : "#000000", border: "2px solid #000000", borderBottom: "none", fontWeight: "bold", cursor: "pointer" }} onClick={() => setActiveTab("payments")}>💳 Payments ({payments.length || 0})</button>
        <button className={`xp-tab${activeTab === "raw" ? " active" : ""}`} style={{ padding: "10px 20px", background: activeTab === "raw" ? "#000000" : "#f0f0f0", color: activeTab === "raw" ? "#ffffff" : "#000000", border: "2px solid #000000", borderBottom: "none", fontWeight: "bold", cursor: "pointer" }} onClick={() => setActiveTab("raw")}>📦 Raw Purchases ({rawPurchases.length || 0})</button>
        <button className={`xp-tab${activeTab === "all" ? " active" : ""}`} style={{ padding: "10px 20px", background: activeTab === "all" ? "#000000" : "#f0f0f0", color: activeTab === "all" ? "#ffffff" : "#000000", border: "2px solid #000000", borderBottom: "none", fontWeight: "bold", cursor: "pointer" }} onClick={() => setActiveTab("all")}>📊 All Transactions ({allTransactions.length})</button>
      </div>

      {/* Expand/Collapse All Button */}
      {(activeTab === "invoices" || activeTab === "raw") && (sales.length > 0 || rawPurchases.length > 0) && (
        <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-end" }}>
          <button className="xp-btn xp-btn-sm" style={{ border: "2px solid #000000", fontWeight: "bold" }} onClick={toggleExpandAll} title={expandAll ? "Collapse All Invoices" : "Expand All Invoices"}>
            {expandAll ? "📋 Collapse All" : "📄 Expand All"}
          </button>
        </div>
      )}

      {/* Content */}
      <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
        {loading && <div style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>Loading...</div>}
        
        {/* Invoices Tab */}
        {activeTab === "invoices" && !loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "2px solid #000000" }}>
              <thead>
                <tr style={{ background: "#000000", color: "#ffffff" }}>
                  <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Invoice No</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Date</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Type</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Total</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Paid</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Balance</th>
                  <th style={{ width: 140, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...(Array.isArray(sales) ? sales : []), ...(Array.isArray(rawPurchases) ? rawPurchases : [])]
                  .sort((a,b) => new Date(b.invoiceDate) - new Date(a.invoiceDate))
                  .map((inv, i) => {
                    const isExpanded = expandedInvoices[inv._id];
                    return (
                      <Fragment key={inv._id || i}>
                        <tr style={{ background: inv.saleType === "raw-purchase" ? "#fef9e6" : "#ffffff", borderBottom: "1px solid #000000" }}>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold" }}>{i + 1}</td>
                          <td style={{ padding: "8px", border: "1px solid #000000", fontWeight: "bold" }}><strong>{inv.invoiceNo}</strong></td>
                          <td style={{ padding: "8px", border: "1px solid #000000" }}>{inv.invoiceDate}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000" }}>
                            <span style={{ background: inv.saleType === "raw-purchase" ? "#fef3c7" : "#dbeafe", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000" }}>
                              {inv.saleType === "raw-purchase" ? "Raw Purchase" : "Sale"}
                            </span>
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(inv.netTotal)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", color: "#059669", fontWeight: "bold" }}>PKR {fmt(inv.paidAmount)}</td>
                          <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: inv.balance > 0 ? "#dc2626" : "#059669" }}>
                            {inv.balance > 0 ? `PKR ${fmt(inv.balance)}` : "✓"}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000" }}>
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button className="xp-btn xp-btn-sm" style={{ border: "1px solid #000000", fontWeight: "bold" }} onClick={() => toggleInvoiceExpand(inv._id)} title={isExpanded ? "Hide Items" : "Show Items"}>
                                {isExpanded ? "📄 Hide" : "📄 Show"}
                              </button>
                              <button className="xp-btn xp-btn-sm" style={{ border: "1px solid #000000", fontWeight: "bold" }} onClick={() => handleViewInvoice(inv)} title="View Invoice">👁️</button>
                              <button className="xp-btn xp-btn-sm" style={{ border: "1px solid #000000", fontWeight: "bold" }} onClick={() => printInvoice(inv, customer)} title="Print Invoice">🖨️</button>
                              <button className="xp-btn xp-btn-sm" style={{ background: "#25D366", color: "#ffffff", border: "1px solid #000000", fontWeight: "bold" }} onClick={() => shareInvoice(inv, customer)} title="Share Invoice">📱</button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && renderInvoiceItems(inv)}
                      </Fragment>
                    );
                  })}
              </tbody>
              <tfoot style={{ background: "#f5f5f5", fontWeight: "bold" }}>
                <tr>
                  <td colSpan="4" style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>TOTAL:</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(totalSales + totalRawPurchases)}</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(totalPaid + totalPayments)}</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(outstanding)}</td>
                  <td style={{ padding: "8px", border: "1px solid #000000" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "payments" && !loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "2px solid #000000" }}>
              <thead>
                <tr style={{ background: "#000000", color: "#ffffff" }}>
                  <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Reference</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Date</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Amount</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(payments) && payments.map((p, i) => (
                  <tr key={p._id || i} style={{ borderBottom: "1px solid #000000" }}>
                    <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #000000", fontWeight: "bold" }}><strong>PAY-{p.paymentNo || p._id?.slice(-6)}</strong></td>
                    <td style={{ padding: "8px", border: "1px solid #000000" }}>{p.paymentDate || p.createdAt?.split("T")[0]}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", color: "#059669", fontWeight: "bold" }}>PKR {fmt(p.amount)}</td>
                    <td style={{ padding: "8px", border: "1px solid #000000" }}>{p.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot style={{ background: "#f5f5f5", fontWeight: "bold" }}>
                <tr>
                  <td colSpan="3" style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>Total</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", color: "#059669", fontWeight: "bold" }}>PKR {fmt(totalPayments)}</td>
                  <td style={{ padding: "8px", border: "1px solid #000000" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Raw Purchases Tab */}
        {activeTab === "raw" && !loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "2px solid #000000" }}>
              <thead>
                <tr style={{ background: "#000000", color: "#ffffff" }}>
                  <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Invoice No</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Date</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Total</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Paid</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Balance</th>
                  <th style={{ width: 140, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(rawPurchases) && rawPurchases.map((r, i) => {
                  const isExpanded = expandedInvoices[r._id];
                  return (
                    <Fragment key={r._id || i}>
                      <tr style={{ background: "#fef9e6", borderBottom: "1px solid #000000" }}>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold" }}>{i + 1}</td>
                        <td style={{ padding: "8px", border: "1px solid #000000", fontWeight: "bold" }}><strong>{r.invoiceNo}</strong></td>
                        <td style={{ padding: "8px", border: "1px solid #000000" }}>{r.invoiceDate}</td>
                        <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(r.netTotal)}</td>
                        <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", color: "#059669", fontWeight: "bold" }}>PKR {fmt(r.paidAmount)}</td>
                        <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: r.balance > 0 ? "#dc2626" : "#059669" }}>
                          {r.balance > 0 ? `PKR ${fmt(r.balance)}` : "✓"}
                        </td>
                        <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000" }}>
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button className="xp-btn xp-btn-sm" style={{ border: "1px solid #000000", fontWeight: "bold" }} onClick={() => toggleInvoiceExpand(r._id)} title={isExpanded ? "Hide Items" : "Show Items"}>
                              {isExpanded ? "📄 Hide" : "📄 Show"}
                            </button>
                            <button className="xp-btn xp-btn-sm" style={{ border: "1px solid #000000", fontWeight: "bold" }} onClick={() => handleViewInvoice(r)}>👁️</button>
                            <button className="xp-btn xp-btn-sm" style={{ border: "1px solid #000000", fontWeight: "bold" }} onClick={() => printInvoice(r, customer)}>🖨️</button>
                            <button className="xp-btn xp-btn-sm" style={{ background: "#25D366", color: "#ffffff", border: "1px solid #000000", fontWeight: "bold" }} onClick={() => shareInvoice(r, customer)}>📱</button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && renderInvoiceItems(r)}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot style={{ background: "#f5f5f5", fontWeight: "bold" }}>
                <tr>
                  <td colSpan="3" style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>TOTAL:</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(totalRawPurchases)}</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>PKR {fmt(totalPayments)}</td>
                  <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(outstanding)}</td>
                  <td style={{ padding: "8px", border: "1px solid #000000" }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* All Transactions Tab */}
        {activeTab === "all" && !loading && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", border: "2px solid #000000" }}>
              <thead>
                <tr style={{ background: "#000000", color: "#ffffff" }}>
                  <th style={{ width: 40, padding: "10px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Reference</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Date</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Debit</th>
                  <th style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Credit</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Type</th>
                  <th style={{ padding: "10px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {allTransactions.map((t, i) => (
                  <tr key={t._id || i} style={{ background: t.type === "payment" ? "#ecfdf5" : "#ffffff", borderBottom: "1px solid #000000" }}>
                    <td style={{ padding: "8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold" }}>{i + 1}</td>
                    <td style={{ padding: "8px", border: "1px solid #000000", fontWeight: "bold" }}><strong>{t.invoiceNo || t._id?.slice(-6)}</strong></td>
                    <td style={{ padding: "8px", border: "1px solid #000000" }}>{t.date}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>{t.type !== "payment" ? `PKR ${fmt(t.netTotal)}` : "—"}</td>
                    <td style={{ padding: "8px", textAlign: "right", border: "1px solid #000000", color: "#059669", fontWeight: "bold" }}>{t.type === "payment" ? `PKR ${fmt(t.amount)}` : (t.paidAmount > 0 ? `PKR ${fmt(t.paidAmount)}` : "—")}</td>
                    <td style={{ padding: "8px", border: "1px solid #000000" }}>
                      <span style={{ background: t.type === "payment" ? "#10b981" : (t.saleType === "raw-purchase" ? "#f59e0b" : "#3b82f6"), color: "#ffffff", padding: "2px 8px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold" }}>
                        {t.type === "payment" ? "💵 Payment" : (t.saleType === "raw-purchase" ? "📦 Raw Purchase" : "🛒 Sale")}
                      </span>
                    </td>
                    <td style={{ padding: "8px", border: "1px solid #000000" }}>{t.remarks || (t.items?.length ? `${t.items.length} items` : "")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="xp-overlay" onClick={() => setShowInvoiceModal(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div className="xp-modal" style={{ maxWidth: 900, width: "90%", maxHeight: "85vh", overflow: "auto", background: "#ffffff", border: "2px solid #000000", borderRadius: "8px" }}>
            <div className="xp-modal-tb" style={{ background: "#000000", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="xp-modal-title" style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff" }}>Invoice {selectedInvoice.invoiceNo}</span>
              <button className="xp-cap-btn xp-cap-close" onClick={() => setShowInvoiceModal(false)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "18px", cursor: "pointer" }}>✕</button>
            </div>
            <div className="xp-modal-body" style={{ padding: 20 }}>
              <div dangerouslySetInnerHTML={{ __html: buildInvoiceHtml(selectedInvoice, customer) }} />
            </div>
            <div className="xp-modal-footer" style={{ padding: "12px 16px", borderTop: "2px solid #000000", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button className="xp-btn" style={{ border: "2px solid #000000", fontWeight: "bold", padding: "6px 16px" }} onClick={() => printInvoice(selectedInvoice, customer)}>🖨️ Print</button>
              <button className="xp-btn" style={{ background: "#25D366", color: "#ffffff", border: "2px solid #000000", fontWeight: "bold", padding: "6px 16px" }} onClick={() => shareInvoice(selectedInvoice, customer)}>📱 Share on WhatsApp</button>
              <button className="xp-btn" style={{ border: "2px solid #000000", fontWeight: "bold", padding: "6px 16px" }} onClick={() => setShowInvoiceModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE - Credit Customers List with Search (Image only, no label)
════════════════════════════════════════════════════════════ */
export default function CreditCustomersPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const searchRef = useRef(null);

  useEffect(() => {
    loadCustomers();
    searchRef.current?.focus();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(EP.CUSTOMERS.GET_ALL + "?type=credit");
      if (data.success) {
        setCustomers(Array.isArray(data.data) ? data.data : []);
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

  const totalCustomers = Array.isArray(customers) ? customers.length : 0;
  const dueCustomers = Array.isArray(customers) ? customers.filter((c) => (c.currentBalance || 0) > 0) : [];
  const totalDue = Array.isArray(customers) ? customers.reduce((s, c) => s + Math.max(0, c.currentBalance || 0), 0) : 0;

  const filtered = Array.isArray(customers) ? customers.filter((c) => {
    const query = search.toLowerCase();
    return !query || 
      c.name?.toLowerCase().includes(query) ||
      c.phone?.includes(query) ||
      c.code?.toLowerCase().includes(query) ||
      c.area?.toLowerCase().includes(query);
  }) : [];

  const handleCustomerClick = (customer) => {
    setSelectedCustomer(customer);
  };

  if (selectedCustomer) {
    return <CustomerDetailPage customer={selectedCustomer} onBack={() => setSelectedCustomer(null)} />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#ffffff" }}>
      <div className="xp-titlebar" style={{ background: "#1e40af", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button className="xp-cap-btn" onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "16px", cursor: "pointer" }}>←</button>
        <span className="xp-tb-title" style={{ color: "#ffffff", fontSize: "16px", fontWeight: "bold" }}>Credit Customers — Asim Electric Store</span>
        <div className="xp-tb-actions">
          <button className="xp-btn xp-btn-primary xp-btn-sm" onClick={() => navigate("/customers")} style={{ background: "#ffffff", color: "#1e40af", border: "2px solid #000000", fontWeight: "bold", padding: "6px 12px" }}>+ Add Customer</button>
        </div>
      </div>

      {msg.text && <div className={`xp-alert ${msg.type === "success" ? "xp-alert-success" : "xp-alert-error"}`} style={{ margin: "8px 16px 0", padding: "8px 16px", border: "2px solid #000000", fontWeight: "bold" }}>{msg.text}</div>}

      <div className="xp-page-body" style={{ padding: "16px", background: "#ffffff" }}>
        {/* Stats Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Customers</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#000000" }}>{totalCustomers}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>With Due</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", fontFamily: "monospace", color: "#dc2626" }}>{dueCustomers.length}</div>
          </div>
          <div style={{ background: "#ffffff", border: "2px solid #000000", borderRadius: "10px", padding: "14px 16px" }}>
            <div style={{ fontSize: "11px", fontWeight: "bold", color: "#000000", textTransform: "uppercase", marginBottom: "6px" }}>Total Outstanding</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", fontFamily: "monospace", color: "#dc2626" }}>PKR {fmt(totalDue)}</div>
          </div>
        </div>

        {/* Search Bar - Full width input with margin-top -30px, no label */}
        <div className="xp-toolbar" style={{ marginTop: "-30px", marginBottom: "16px" }}>
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
                height: "42px", 
                width: "100%", 
                fontSize: "14px",
                background: "#ffffff"
              }} 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              placeholder="Search by name, phone, code or area..." 
              autoFocus 
            />
          </div>
        </div>

        {/* Customers Table */}
        <div className="xp-table-panel" style={{ marginTop: 12, border: "2px solid #000000", borderRadius: "8px", overflow: "hidden" }}>
          {loading && <div className="xp-loading" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>Loading customers...</div>}
          {!loading && filtered.length === 0 && <div className="xp-empty" style={{ padding: "40px", textAlign: "center", fontSize: "13px", fontWeight: "bold" }}>No customers found</div>}
          {!loading && filtered.length > 0 && (
            <div className="xp-table-scroll" style={{ overflowX: "auto" }}>
              <table className="xp-table" style={{ fontSize: "13px", cursor: "pointer", width: "100%", borderCollapse: "collapse", border: "2px solid #000000" }}>
                <thead>
                  <tr style={{ background: "#000000", color: "#ffffff" }}>
                    <th style={{ width: 40, padding: "12px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>#</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Code</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Customer Name</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Phone</th>
                    <th style={{ padding: "12px 8px", textAlign: "left", border: "1px solid #333333", fontWeight: "bold" }}>Area</th>
                    <th style={{ padding: "12px 8px", textAlign: "right", border: "1px solid #333333", fontWeight: "bold" }}>Outstanding</th>
                    <th style={{ padding: "12px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Status</th>
                    <th style={{ width: 100, padding: "12px 8px", textAlign: "center", border: "1px solid #333333", fontWeight: "bold" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr key={c._id} style={{ borderBottom: "1px solid #000000", background: (c.currentBalance || 0) > 0 ? "#fff5f5" : "#ffffff" }}>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000", fontWeight: "bold", color: "#666" }}>{i + 1}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", fontFamily: "monospace", fontSize: "12px", fontWeight: "bold", background: "#f5f5f5" }}>{c.code || "—"}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000" }}>
                        <button className="xp-link-btn" onClick={() => handleCustomerClick(c)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontWeight: "bold", fontSize: "13px" }}>
                          <strong>{c.name}</strong>
                        </button>
                      </td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{c.phone || "—"}</td>
                      <td style={{ padding: "10px 8px", border: "1px solid #000000", color: "#666" }}>{c.area || "—"}</td>
                      <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: (c.currentBalance || 0) > 0 ? "#dc2626" : "#059669" }}>
                        PKR {fmt(c.currentBalance || 0)}
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                        <span style={{ background: (c.currentBalance || 0) > 0 ? "#fee2e2" : "#d1fae5", color: (c.currentBalance || 0) > 0 ? "#dc2626" : "#059669", padding: "4px 12px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid #000000" }}>
                          {(c.currentBalance || 0) > 0 ? "Due" : "Clear"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center", border: "1px solid #000000" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button className="xp-btn xp-btn-sm" onClick={() => handleCustomerClick(c)} style={{ border: "1px solid #000000", fontWeight: "bold", padding: "4px 10px" }} title="Full Details">📋</button>
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
                    <td colSpan="5" style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold" }}>Total</td>
                    <td style={{ padding: "10px 8px", textAlign: "right", border: "1px solid #000000", fontWeight: "bold", color: "#dc2626" }}>PKR {fmt(filtered.reduce((s, c) => s + Math.max(0, c.currentBalance || 0), 0))}</td>
                    <td colSpan="2" style={{ padding: "10px 8px", border: "1px solid #000000" }}> </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="xp-statusbar" style={{ background: "#f0f0f0", borderTop: "2px solid #000000", padding: "6px 16px", display: "flex", justifyContent: "space-between" }}>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>👥 {totalCustomers} customers</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "bold", color: "#dc2626" }}>⚠️ {dueCustomers.length} due</div>
        <div className="xp-status-pane" style={{ fontSize: "11px", fontWeight: "bold", color: "#000000" }}>💰 Outstanding: PKR {fmt(totalDue)}</div>
      </div>
    </div>
  );
}
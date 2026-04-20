import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ProductPage from "./pages/ProductPage.jsx";
import SalePage from "./pages/SalePage.jsx";
import DebitSalePage from "./pages/DebitSalePage.jsx";
import CreditSalePage from "./pages/CreditSalePage.jsx";
import CustomersPage from "./pages/CustomersPage.jsx";
import SaleHistoryPage from "./pages/SaleHistoryPage.jsx";
import SaleReturnPage from "./pages/SaleReturnPage.jsx";
import PurchaseReturnPage from "./pages/PurchaseReturnPage.jsx";
import ComingSoon from "./pages/ComingSoon.jsx";
import CreditCustomersPage from "./pages/CreditCustomersPage.jsx";
import QuotationPage from "./pages/QuotationPage.jsx";
import DebitCustomersPage from "./pages/DebitCustomersPage.jsx";
import JournalVoucherPage from "./pages/JournalVoucherPage.jsx";
import ManualSalePage from "./pages/ManualSalePage.jsx";
import ManualPurchasePage from "./pages/ManualPurchasePage.jsx";
import RawSalePage from "./pages/RawSalePage.jsx";
import RawPurchasePage from "./pages/RawPurchasePage.jsx";
import PurchasePage from "./pages/PurchasePage.jsx";
import DamageInPage from "./pages/DamageInPage.jsx";
import DamageOutPage from "./pages/DamageOutPage.jsx";
import CashPaymentVoucher from "./pages/CashPaymentVoucher.jsx";
import SuppliersPage from "./pages/SuppliersPage.jsx";
import CashReceiptsPage from "./pages/CashReceiptsPage.jsx";
import GeneralLedgerPage from "./pages/GeneralLedgerPage.jsx";
import PurchaseReturnListPage from "./pages/PurchaseReturnListPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";


// Report Pages (from Reports folder)
import PurchaseReportPage from "./pages/Reports/PurchaseReportPage.jsx";
import PurchaseWithoutValuesPage from "./pages/Reports/PurchaseWithoutValuesPage.jsx";
import PurchaseReturnReportPage from "./pages/Reports/PurchaseReturnReportPage.jsx";
import SalePartyWisePage from "./pages/Reports/SalePartyWisePage.jsx";
import TopSalesPage from "./pages/Reports/TopSalesPage.jsx";
import SalesReturnReportPage from "./pages/Reports/SalesReturnReportPage.jsx";
import SaleReturnWithoutValuesPage from "./pages/Reports/SaleReturnWithoutValuesPage.jsx";
import ExchangePage from "./pages/ExchangePage.jsx";
import ProfitReportNumberWisePage from "./pages/Reports/ProfitReportNumberWisePage.jsx";
import CounterSummaryPage from "./pages/Reports/CounterSummaryPage.jsx";
import StockReportPage from "./pages/Reports/StockReportPage.jsx";
import BankDepositsPage from "./pages/Reports/BankDepositsPage.jsx";
import BankPaymentsPage from "./pages/Reports/BankPaymentsPage.jsx";
import ExpensesPage from "./pages/ExpensesPage.jsx";
import AccountsPayableReceivablePage from "./pages/Reports/AccountsPayableReceivablePage.jsx";
import PurchaseOrderPage from "./pages/PurchaseOrderPage.jsx";
import PurchaseOrderListPage from "./pages/PurchaseOrderListPage.jsx";
import QuotationListPage from "./pages/QuotationListPage.jsx";
import ExchangeListPage from "./pages/ExchangeListPage.jsx";
import JournalVoucherListPage from "./pages/JournalVoucherListPage.jsx";
import ExpensesListPage from "./pages/ExpensesListPage.jsx";
import ChartOfProductsPage from "./pages/Reports/ChartOfProductsPage.jsx";
import DailySaleReportPage from "./pages/Reports/DailySaleReportPage.jsx";
import SaleListPage from "./pages/Reports/SaleListPage.jsx";
import PurchaseListPage from "./pages/Reports/PurchaseListPage.jsx";
import TrialBalancePage from "./pages/Reports/TrialBalancePage.jsx";
import BalanceSheetPage from "./pages/Reports/BalanceSheetPage.jsx";
import ProfitLossPage from "./pages/Reports/ProfitLossPage.jsx";
import CashBookPage from "./pages/Reports/CashBookPage.jsx";
import ReceivablesPage from "./pages/Reports/ReceivablesPage.jsx";
import PayablesPage from "./pages/Reports/PayablesPage.jsx";
import CompanyInfoPage from "./pages/CompanyInfoPage.jsx";
import BackupPage from "./pages/BackupPage.jsx";
import PreferencesPage from "./pages/PreferencesPage.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import SupportPage from "./pages/SupportPage.jsx";



import { GlobalFontProvider } from "./components/GlobalFontProvider.jsx";
import ProductHistoryPage from "./pages/ProductHistoryPage.jsx";
import RawPurchaseReportPage from "./pages/Reports/RawPurchaseReportPage.jsx";

// Create a wrapper component that provides the current location as key
function AppRoutes() {
  const location = useLocation();
  
  return (
    <Routes>
      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/sale" replace />} />
      
      {/* Vouchers */}
      <Route path="/sale" element={<SalePage key={`sale-${location.pathname}`} />} />
      <Route path="/debit-sale" element={<DebitSalePage key={`debit-sale-${location.pathname}`} />} />
      <Route path="/credit-sale" element={<CreditSalePage key={`credit-sale-${location.pathname}`} />} />
      <Route path="/manual-sale" element={<ManualSalePage key={`manual-sale-${location.pathname}`} />} />
      <Route path="/manual-purchase" element={<ManualPurchasePage key={`manual-purchase-${location.pathname}`} />} />
      <Route path="/sale-return" element={<SaleReturnPage key={`sale-return-${location.pathname}`} />} />
      <Route path="/purchase-return" element={<PurchaseReturnPage key={`purchase-return-${location.pathname}`} />} />
      <Route path="/quotation-page" element={<QuotationPage key={`quotation-${location.pathname}`} />} />
      <Route path="/purchase-order" element={<PurchaseOrderPage key={`purchase-order-${location.pathname}`} />} />
      <Route path="/raw-sale" element={<RawSalePage key={`raw-sale-${location.pathname}`} />} />
      <Route path="/raw-purchase" element={<RawPurchasePage key={`raw-purchase-${location.pathname}`} />} />
      <Route path="/damage-in" element={<DamageInPage key={`damage-in-${location.pathname}`} />} />
      <Route path="/damage-out" element={<DamageOutPage key={`damage-out-${location.pathname}`} />} />
      <Route path="/purchase" element={<PurchasePage key={`purchase-${location.pathname}`} />} />
      <Route path="/exchange" element={<ExchangePage key={`exchange-${location.pathname}`} />} />
      <Route path="/journal-voucher" element={<JournalVoucherPage key={`journal-${location.pathname}`} />} />
      <Route path="/expenses" element={<ExpensesPage key={`expenses-${location.pathname}`} />} />
      <Route path="/product-history" element={<ProductHistoryPage key={`expenses-${location.pathname}`} />} />
      
      {/* Customers */}
      <Route path="/debit-customers" element={<DebitCustomersPage key={`debit-customers-${location.pathname}`} />} />
      <Route path="/credit-customers" element={<CreditCustomersPage key={`credit-customers-${location.pathname}`} />} />
      <Route path="/cash-receipts" element={<CashReceiptsPage key={`cash-receipts-${location.pathname}`} />} />
      <Route path="/cash-payment" element={<CashPaymentVoucher key={`cash-payment-${location.pathname}`} />} />
      <Route path="/customers" element={<CustomersPage key={`customers-${location.pathname}`} />} />
      <Route path="/suppliers" element={<SuppliersPage key={`suppliers-${location.pathname}`} />} />
      
      {/* Define */}
      <Route path="/products" element={<ProductPage key={`products-${location.pathname}`} />} />
      <Route path="/chart-of-products" element={<ChartOfProductsPage key={`chart-of-products-${location.pathname}`} />} />
      
      {/* Reports */}
      <Route path="/sale-history" element={<SaleHistoryPage key={`sale-history-${location.pathname}`} />} />
      <Route path="/sale-list" element={<SaleListPage key={`sale-list-${location.pathname}`} />} />
      <Route path="/sale-party-wise" element={<SalePartyWisePage key={`sale-party-wise-${location.pathname}`} />} />
      <Route path="/top-sales" element={<TopSalesPage key={`top-sales-${location.pathname}`} />} />
      <Route path="/sales-return" element={<SalesReturnReportPage key={`sales-return-${location.pathname}`} />} />
      <Route path="/sale-return-without-values" element={<SaleReturnWithoutValuesPage key={`sale-return-without-values-${location.pathname}`} />} />
      <Route path="/purchase-list" element={<PurchaseListPage key={`purchase-list-${location.pathname}`} />} />
      <Route path="/purchase-report" element={<PurchaseReportPage key={`purchase-report-${location.pathname}`} />} />
      <Route path="/purchase-without-values" element={<PurchaseWithoutValuesPage key={`purchase-without-values-${location.pathname}`} />} />
      <Route path="/purchase-return-list" element={<PurchaseReturnListPage key={`purchase-return-list-${location.pathname}`} />} />
      <Route path="/purchase-return-report" element={<PurchaseReturnReportPage key={`purchase-return-report-${location.pathname}`} />} />
      <Route path="/purchase-order-list" element={<PurchaseOrderListPage key={`purchase-order-list-${location.pathname}`} />} />
      <Route path="/quotation-list" element={<QuotationListPage key={`quotation-list-${location.pathname}`} />} />
      <Route path="/exchange-list" element={<ExchangeListPage key={`exchange-list-${location.pathname}`} />} />
      <Route path="/profit-report-number-wise" element={<ProfitReportNumberWisePage key={`profit-report-number-wise-${location.pathname}`} />} />
      <Route path="/raw-purchase-list" element={<RawPurchaseReportPage key={`raw-purchase-list-${location.pathname}`} />} />
      <Route path="/raw-sale-list" element={<RawSalePage key={`raw-sale-list-${location.pathname}`} />} />
      <Route path="/counter-summary" element={<CounterSummaryPage key={`counter-summary-${location.pathname}`} />} />
      <Route path="/stock-report" element={<StockReportPage key={`stock-report-${location.pathname}`} />} />
      <Route path="/daily-sale" element={<DailySaleReportPage key={`daily-sale-${location.pathname}`} />} />
      
      {/* Cash/Bank Reports */}
      <Route path="/cash-receipts-report" element={<CashReceiptsPage key={`cash-receipts-report-${location.pathname}`} />} />
      <Route path="/cash-payment-report" element={<CashPaymentVoucher key={`cash-payment-report-${location.pathname}`} />} />
      <Route path="/bank-deposits" element={<BankDepositsPage key={`bank-deposits-${location.pathname}`} />} />
      <Route path="/bank-payments" element={<BankPaymentsPage key={`bank-payments-${location.pathname}`} />} />
      
      {/* Journal Voucher Reports */}
      <Route path="/journal-voucher-list" element={<JournalVoucherListPage key={`journal-voucher-list-${location.pathname}`} />} />
      <Route path="/expenses-list" element={<ExpensesListPage key={`expenses-list-${location.pathname}`} />} />
      
      {/* Final Accounts */}
      <Route path="/general-ledger" element={<GeneralLedgerPage key={`general-ledger-${location.pathname}`} />} />
      <Route path="/trial-balance" element={<TrialBalancePage key={`trial-balance-${location.pathname}`} />} />
      <Route path="/balance-sheet" element={<BalanceSheetPage key={`balance-sheet-${location.pathname}`} />} />
      <Route path="/profit-loss" element={<ProfitLossPage key={`profit-loss-${location.pathname}`} />} />
      <Route path="/cash-book" element={<CashBookPage key={`cash-book-${location.pathname}`} />} />
      <Route path="/receivables" element={<ReceivablesPage key={`receivables-${location.pathname}`} />} />
      <Route path="/payables" element={<PayablesPage key={`payables-${location.pathname}`} />} />
      <Route path="/accounts-payable-receivable" element={<AccountsPayableReceivablePage key={`accounts-payable-receivable-${location.pathname}`} />} />
      
      {/* Tools */}
      <Route path="/company-info" element={<CompanyInfoPage key={`company-info-${location.pathname}`} />} />
      <Route path="/backup" element={<BackupPage key={`backup-${location.pathname}`} />} />
      <Route path="/settings" element={<SettingsPage key={`settings-${location.pathname}`} />} />
      <Route path="/preferences" element={<PreferencesPage key={`preferences-${location.pathname}`} />} />
      
      {/* Help */}
      <Route path="/about" element={<AboutPage key={`about-${location.pathname}`} />} />
      <Route path="/support" element={<SupportPage key={`support-${location.pathname}`} />} />
      
      {/* Catch All */}
      <Route path="*" element={<ComingSoon key={`coming-soon-${location.pathname}`} />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <GlobalFontProvider>
        <Layout>
          <AppRoutes />
        </Layout>
      </GlobalFontProvider>
    </BrowserRouter>
  );
}
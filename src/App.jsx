// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/PermissionGuard";
import { PERMISSIONS } from "./constants/permissions";
import Layout from "./components/Layout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import UserManagementPage from "./pages/UserManagementPage.jsx";

// Import all your existing pages
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
import RawSaleListPage from './pages/RawSaleListPage.jsx';
import { GlobalFontProvider } from "./components/GlobalFontProvider.jsx";
import ProductHistoryPage from "./pages/ProductHistoryPage.jsx";
import RawPurchaseReportPage from "./pages/Reports/RawPurchaseReportPage.jsx";

// Wrapper component for protected routes
function AppRoutes() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <Routes>
      {/* Default Redirect */}
      <Route path="/" element={<Navigate to="/sale" replace />} />
      <Route path="/login" element={<Navigate to="/sale" replace />} />
      
      {/* User Management - Admin only */}
      <Route 
        path="/user-management" 
        element={
          <ProtectedRoute permission={PERMISSIONS.USER_MANAGEMENT}>
            <UserManagementPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Vouchers */}
      <Route 
        path="/sale" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_SALE}>
            <SalePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/debit-sale" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_SALE}>
            <DebitSalePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/credit-sale" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_SALE}>
            <CreditSalePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manual-sale" 
        element={
          <ProtectedRoute permission={PERMISSIONS.MANUAL_SALE}>
            <ManualSalePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/manual-purchase" 
        element={
          <ProtectedRoute permission={PERMISSIONS.MANUAL_PURCHASE}>
            <ManualPurchasePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sale-return" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALE_RETURN}>
            <SaleReturnPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-return" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_RETURN}>
            <PurchaseReturnPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/quotation-page" 
        element={
          <ProtectedRoute permission={PERMISSIONS.QUOTATION}>
            <QuotationPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-order" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_ORDER}>
            <PurchaseOrderPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/raw-sale" 
        element={
          <ProtectedRoute permission={PERMISSIONS.RAW_SALE}>
            <RawSalePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/raw-purchase" 
        element={
          <ProtectedRoute permission={PERMISSIONS.RAW_PURCHASE}>
            <RawPurchasePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/damage-in" 
        element={
          <ProtectedRoute permission={PERMISSIONS.DAMAGE_IN}>
            <DamageInPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/damage-out" 
        element={
          <ProtectedRoute permission={PERMISSIONS.DAMAGE_OUT}>
            <DamageOutPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE}>
            <PurchasePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/exchange" 
        element={
          <ProtectedRoute permission={PERMISSIONS.EXCHANGE}>
            <ExchangePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/journal-voucher" 
        element={
          <ProtectedRoute permission={PERMISSIONS.GENERAL_LEDGER}>
            <JournalVoucherPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/expenses" 
        element={
          <ProtectedRoute permission={PERMISSIONS.EXPENSES}>
            <ExpensesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/product-history" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PRODUCT_HISTORY}>
            <ProductHistoryPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Customers */}
      <Route 
        path="/debit-customers" 
        element={
          <ProtectedRoute permission={PERMISSIONS.DEBIT_CUSTOMERS_VIEW}>
            <DebitCustomersPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/credit-customers" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CREDIT_CUSTOMERS_VIEW}>
            <CreditCustomersPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cash-receipts" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_RECEIPTS}>
            <CashReceiptsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cash-payment" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_PAYMENT}>
            <CashPaymentVoucher />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customers" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CUSTOMERS_VIEW}>
            <CustomersPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/suppliers" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SUPPLIERS_VIEW}>
            <SuppliersPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Define */}
      <Route 
        path="/products" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PRODUCTS_VIEW}>
            <ProductPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/chart-of-products" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CHART_OF_PRODUCTS_VIEW}>
            <ChartOfProductsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Reports */}
      <Route 
        path="/sale-history" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALE_HISTORY}>
            <SaleHistoryPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sale-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALE_HISTORY}>
            <SaleListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sale-party-wise" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALE_PARTY_WISE}>
            <SalePartyWisePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/top-sales" 
        element={
          <ProtectedRoute permission={PERMISSIONS.TOP_SALES}>
            <TopSalesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sales-return" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALES_RETURN}>
            <SalesReturnReportPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/sale-return-without-values" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALE_RETURN_WITHOUT_VALUES}>
            <SaleReturnWithoutValuesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_LIST}>
            <PurchaseListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-report" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_REPORT}>
            <PurchaseReportPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-without-values" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_WITHOUT_VALUES}>
            <PurchaseWithoutValuesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-return-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_RETURN_LIST}>
            <PurchaseReturnListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-return-report" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_RETURN_LIST}>
            <PurchaseReturnReportPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/purchase-order-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PURCHASE_ORDER_LIST}>
            <PurchaseOrderListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/quotation-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.QUOTATION_LIST}>
            <QuotationListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/exchange-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.EXCHANGE_LIST}>
            <ExchangeListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profit-report-number-wise" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PROFIT_REPORT}>
            <ProfitReportNumberWisePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/raw-purchase-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.RAW_PURCHASE_LIST}>
            <RawPurchaseReportPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/raw-sale-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.RAW_SALE_LIST}>
            <RawSaleListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/counter-summary" 
        element={
          <ProtectedRoute permission={PERMISSIONS.COUNTER_SUMMARY}>
            <CounterSummaryPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/stock-report" 
        element={
          <ProtectedRoute permission={PERMISSIONS.STOCK_REPORT}>
            <StockReportPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/daily-sale" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SALE_HISTORY}>
            <DailySaleReportPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Cash/Bank Reports */}
      <Route 
        path="/cash-receipts-report" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_RECEIPT_REPORT}>
            <CashReceiptsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cash-payment-report" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_PAYMENT_REPORT}>
            <CashPaymentVoucher />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bank-deposits" 
        element={
          <ProtectedRoute permission={PERMISSIONS.BANK_DEPOSITS}>
            <BankDepositsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/bank-payments" 
        element={
          <ProtectedRoute permission={PERMISSIONS.BANK_PAYMENTS}>
            <BankPaymentsPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Journal Voucher Reports */}
      <Route 
        path="/journal-voucher-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.JOURNAL_VOUCHER_LIST}>
            <JournalVoucherListPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/expenses-list" 
        element={
          <ProtectedRoute permission={PERMISSIONS.EXPENSES_LIST}>
            <ExpensesListPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Final Accounts */}
      <Route 
        path="/general-ledger" 
        element={
          <ProtectedRoute permission={PERMISSIONS.GENERAL_LEDGER}>
            <GeneralLedgerPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trial-balance" 
        element={
          <ProtectedRoute permission={PERMISSIONS.TRIAL_BALANCE}>
            <TrialBalancePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/balance-sheet" 
        element={
          <ProtectedRoute permission={PERMISSIONS.BALANCE_SHEET}>
            <BalanceSheetPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/profit-loss" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PROFIT_LOSS}>
            <ProfitLossPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/cash-book" 
        element={
          <ProtectedRoute permission={PERMISSIONS.CASH_BOOK}>
            <CashBookPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/receivables" 
        element={
          <ProtectedRoute permission={PERMISSIONS.RECEIVABLES}>
            <ReceivablesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/payables" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PAYABLES}>
            <PayablesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/accounts-payable-receivable" 
        element={
          <ProtectedRoute permission={PERMISSIONS.ACCOUNTS_PAYABLE_RECEIVABLE}>
            <AccountsPayableReceivablePage />
          </ProtectedRoute>
        } 
      />
      
      {/* Tools */}
      <Route 
        path="/company-info" 
        element={
          <ProtectedRoute permission={PERMISSIONS.COMPANY_INFO}>
            <CompanyInfoPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/backup" 
        element={
          <ProtectedRoute permission={PERMISSIONS.BACKUP}>
            <BackupPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SETTINGS}>
            <SettingsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/preferences" 
        element={
          <ProtectedRoute permission={PERMISSIONS.PREFERENCES}>
            <PreferencesPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Help */}
      <Route 
        path="/about" 
        element={
          <ProtectedRoute permission={PERMISSIONS.ABOUT}>
            <AboutPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/support" 
        element={
          <ProtectedRoute permission={PERMISSIONS.SUPPORT}>
            <SupportPage />
          </ProtectedRoute>
        } 
      />
      
      {/* Catch All */}
      <Route path="*" element={<ComingSoon />} />
    </Routes>
  );
}

// Main App component with authentication and GlobalFontProvider
function AuthenticatedApp() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'Tahoma, sans-serif'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return (
    <GlobalFontProvider>
      <Layout>
        <AppRoutes />
      </Layout>
    </GlobalFontProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<AuthenticatedApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useCart } from './hooks/useCart';
import Header from './components/Header';
import SubNav from './components/SubNav';
import Menu from './components/Menu';
import Cart from './components/Cart';
import Footer from './components/Footer';
import PromoSignup from './components/PromoSignup';
import { ToastProvider } from './components/ToastNotification';
import VerificationGateway from './components/VerificationGateway';
import { MenuProvider, useMenuContext } from './contexts/MenuContext';
import ImportantNoticeModal from './components/ImportantNoticeModal';
import ProductPageSkeleton from './components/ProductPageSkeleton';

// Lazy-loaded routes — only downloaded when the user navigates to them
const Checkout = lazy(() => import('./components/Checkout'));
const Success = lazy(() => import('./components/Success'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const COA = lazy(() => import('./components/COA'));
const FAQ = lazy(() => import('./components/FAQ'));
const PeptideCalculator = lazy(() => import('./components/PeptideCalculator'));
const OrderTracking = lazy(() => import('./components/OrderTracking'));
const SmartGuide = lazy(() => import('./components/SmartGuide'));
const ArticleDetail = lazy(() => import('./components/ArticleDetail'));
const ProductPage = lazy(() => import('./components/ProductPage'));
const DynamicPage = lazy(() => import('./components/DynamicPage'));

// Resets scroll position to top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);
  return null;
}

function MainApp() {

  const cart = useCart();
  const { menuItems, loading: menuLoading } = useMenuContext();
  const [currentView, setCurrentView] = React.useState<'menu' | 'cart' | 'checkout'>('menu');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [hitpayNotice, setHitpayNotice] = React.useState<
    { kind: 'success' | 'cancel'; orderId: string | null } | null
  >(null);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('hitpay');
    const viewParam = params.get('view');
    const catParam = params.get('category');

    if (catParam) {
      setSelectedCategory(catParam);
    }

    if (result === 'success' || result === 'cancel') {
      const orderId = params.get('order_id');
      if (result === 'success') {
        cart.clearCart();
        setHitpayNotice({ kind: 'success', orderId });
        setCurrentView('menu');
      } else {
        setHitpayNotice({ kind: 'cancel', orderId });
        setCurrentView('checkout');
      }
      params.delete('hitpay');
      params.delete('order_id');
      const next = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', next);
    } else if (viewParam === 'cart' || viewParam === 'checkout') {
      setCurrentView(viewParam);
      params.delete('view');
      const next = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const handleCategoryChange = (e: CustomEvent) => {
      setSelectedCategory(e.detail.categoryId);
      setCurrentView('menu');
    };
    window.addEventListener('categoryChange', handleCategoryChange as EventListener);
    return () => window.removeEventListener('categoryChange', handleCategoryChange as EventListener);
  }, []);

  const handleViewChange = React.useCallback((view: 'menu' | 'cart' | 'checkout') => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  const handleCartClick = React.useCallback(() => handleViewChange('cart'), [handleViewChange]);
  const handleMenuClick = React.useCallback(() => handleViewChange('menu'), [handleViewChange]);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const filteredProducts = selectedCategory === 'all'
    ? menuItems
    : menuItems.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-white font-inter flex flex-col">
      <Header
        cartItemsCount={cart.getTotalItems()}
        onCartClick={handleCartClick}
        onMenuClick={handleMenuClick}
      />

      <PromoSignup />

      {currentView === 'menu' && (
        <SubNav selectedCategory={selectedCategory} onCategoryClick={handleCategoryClick} />
      )}

      {hitpayNotice && (
        <div className={`px-4 py-3 text-sm md:text-base font-medium flex items-center justify-between gap-3 ${
          hitpayNotice.kind === 'success'
            ? 'bg-green-50 text-green-800 border-b border-green-200'
            : 'bg-amber-50 text-amber-800 border-b border-amber-200'
        }`}>
          <span>
            {hitpayNotice.kind === 'success'
              ? `✅ Payment received! Your order${hitpayNotice.orderId ? ` (${hitpayNotice.orderId.slice(0, 8)})` : ''} is confirmed. We'll start processing it shortly.`
              : `⚠️ Payment was cancelled${hitpayNotice.orderId ? ` for order ${hitpayNotice.orderId.slice(0, 8)}` : ''}. You can try again or pick a different payment method.`}
          </span>
          <button
            onClick={() => setHitpayNotice(null)}
            className="px-2 py-1 rounded hover:bg-black/5"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-grow animate-page-in">
        <div style={{ display: currentView === 'menu' ? 'block' : 'none' }}>
          <Menu
            menuItems={filteredProducts}
            loading={menuLoading}
            addToCart={cart.addToCart}
            cartItems={cart.cartItems}
            updateQuantity={cart.updateQuantity}
          />
        </div>

        <div style={{ display: currentView === 'cart' ? 'block' : 'none' }}>
          <Cart
            cartItems={cart.cartItems}
            hydrated={cart.hydrated}
            updateQuantity={cart.updateQuantity}
            removeFromCart={cart.removeFromCart}
            clearCart={cart.clearCart}
            getTotalPrice={cart.getTotalPrice}
            refreshCartPrices={cart.refreshCartPrices}
            pricesUpdatedAt={cart.pricesUpdatedAt}
            dismissPriceUpdateNotice={cart.dismissPriceUpdateNotice}
            onContinueShopping={() => handleViewChange('menu')}
            onCheckout={() => { window.location.href = '/checkout'; }}
          />
        </div>

        {currentView === 'checkout' && (
          <Checkout
            cartItems={cart.cartItems}
            totalPrice={cart.getTotalPrice()}
            refreshCartPrices={cart.refreshCartPrices}
            pricesUpdatedAt={cart.pricesUpdatedAt}
            dismissPriceUpdateNotice={cart.dismissPriceUpdateNotice}
            onBack={() => handleViewChange('cart')}
            onOrderSuccess={() => {
              cart.clearCart();
              handleViewChange('menu');
            }}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function CheckoutPageRoute() {
  const cart = useCart();
  return (
    <Checkout
      cartItems={cart.cartItems}
      totalPrice={cart.getTotalPrice()}
      refreshCartPrices={cart.refreshCartPrices}
      pricesUpdatedAt={cart.pricesUpdatedAt}
      dismissPriceUpdateNotice={cart.dismissPriceUpdateNotice}
      onBack={() => { window.location.href = '/?view=cart'; }}
      onOrderSuccess={() => {
        cart.clearCart();
        window.location.href = '/';
      }}
    />
  );
}

function SubPageLayout() {
  const cart = useCart();
  const handleCartClick = React.useCallback(() => { window.location.href = '/?view=cart'; }, []);
  const handleMenuClick = React.useCallback(() => { window.location.href = '/'; }, []);

  return (
    <div className="min-h-screen bg-white font-inter flex flex-col">
      <Header
        cartItemsCount={cart.getTotalItems()}
        onCartClick={handleCartClick}
        onMenuClick={handleMenuClick}
      />
      <main className="flex-grow animate-page-in pb-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const PageSkeleton = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-[#3C6CA8] border-t-transparent animate-spin" />
      <p className="text-sm text-gray-400">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <VerificationGateway>
      <ImportantNoticeModal />
      <ToastProvider>
        <MenuProvider>
          <Router>
            <ScrollToTop />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route path="/" element={<MainApp />} />
                <Route path="/admin" element={<AdminDashboard />} />

                {/* Standard Pages Layout */}
                <Route element={<SubPageLayout />}>
                  <Route path="/coa" element={<COA />} />
                  <Route path="/checkout" element={<CheckoutPageRoute />} />
                  <Route path="/success" element={<Success />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/calculator" element={<PeptideCalculator />} />
                  <Route path="/track-order" element={<OrderTracking />} />
                  <Route path="/peptalk" element={<SmartGuide />} />
                  <Route path="/peptalk/:id" element={<ArticleDetail />} />
                  <Route path="/about" element={<DynamicPage pageId="about" />} />
                  <Route path="/contact" element={<DynamicPage pageId="contact" />} />
                  <Route path="/shipping-policy" element={<DynamicPage pageId="shipping_policy" />} />
                  <Route path="/privacy-policy" element={<DynamicPage pageId="privacy_policy" />} />
                  <Route path="/terms" element={<DynamicPage pageId="terms_conditions" />} />
                  {/* Catch-all product slug — must stay LAST */}
                  <Route path="/:slug" element={
                    <Suspense fallback={<ProductPageSkeleton />}>
                      <ProductPage />
                    </Suspense>
                  } />
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </MenuProvider>
      </ToastProvider>
    </VerificationGateway>
  );
}

export default App;


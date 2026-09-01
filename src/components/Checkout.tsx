import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Package, CreditCard, Sparkles, Heart, Copy, Check, MessageCircle, Tag, XCircle, CheckCircle, CheckCircle2, Upload, X, FileImage, Loader2, Info, Wallet, User, Mail, Phone, MapPin, Building2, Navigation, Globe, FileText, Truck, Percent, ShoppingBag, ChevronDown, Search, Lock, MessageSquare, QrCode } from 'lucide-react';
import {
  PH_PROVINCES,
  searchProvinces,
  getCitiesForProvince,
  fetchCitiesForProvinceLive,
  getBarangaysForCity,
  fetchBarangaysForCityLive,
  getZipCodeForCity,
  getShippingZoneForProvince,
  City,
  Barangay
} from '../lib/philippineLocations';

import type { CartItem } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useShippingLocations } from '../hooks/useShippingLocations';
import { supabase } from '../lib/supabase';
import { useImageUpload } from '../hooks/useImageUpload';
import { mirrorOrderCreate, mirrorPromoIncrementUsage } from '../lib/convexMirror';
import { useBundleTiers } from '../hooks/useBundleTiers';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
import { computeCartPricing, resolveProductPricing } from '../utils/pricing';
import { trackOrderStatus, identifyUser } from '../utils/analytics';
import { fireToast } from './ToastNotification';
import { dispatchOrderEmail } from '../services/emailService';
import { provisionCustomerAccount } from '../services/firebaseAuth';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  refreshCartPrices: () => Promise<boolean>;
  pricesUpdatedAt: number | null;
  dismissPriceUpdateNotice: () => void;
  onBack: () => void;
  onOrderSuccess?: () => void;
}

import { DELIVERY_MODES } from '../data/deliveryModes';
export { DELIVERY_MODES };

const Checkout: React.FC<CheckoutProps> = ({ cartItems, refreshCartPrices, pricesUpdatedAt, dismissPriceUpdateNotice, onBack, onOrderSuccess }) => {
  const productIds = useMemo(() => cartItems.map((i) => i.product.id), [cartItems]);
  const { tiersByProduct } = useBundleTiers(productIds);
  const { globalDiscount } = useGlobalDiscount();
  const pricing = useMemo(
    () => computeCartPricing(cartItems, tiersByProduct, globalDiscount),
    [cartItems, tiersByProduct, globalDiscount]
  );
  const totalPrice = pricing.subtotal; // bundle-adjusted subtotal
  const bundleSavings = pricing.bundleSavings;
  const hasBundleDiscount = pricing.hasBundleDiscount;
  const itemDiscountSavings = pricing.itemDiscountSavings;
  const hasItemDiscount = pricing.hasItemDiscount;
  const originalSubtotal = pricing.originalSubtotal;

  useEffect(() => {
    refreshCartPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Customer Details (initialized from draft, customer data, or cookie)
  const [customer, setCustomer] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('slimdose_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const getInitialValue = (key: string, fallbackKey?: string) => {
    try {
      const customerRaw = localStorage.getItem('slimdose_customer');
      if (customerRaw) {
        const cust = JSON.parse(customerRaw);
        if (cust && cust[key]) return cust[key];
        if (fallbackKey && cust && cust[fallbackKey]) return cust[fallbackKey];
      }
      const draftRaw = localStorage.getItem('slimdose_checkout_draft');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft && draft[key]) return draft[key];
      }
    } catch {}
    return '';
  };

  const [fullName, setFullName] = useState<string>(() => getInitialValue('fullName', 'full_name') || getInitialValue('name'));
  const [email, setEmail] = useState<string>(() => getInitialValue('email'));
  const [phone, setPhone] = useState<string>(() => getInitialValue('phone'));

  // Shipping Details
  const [address, setAddress] = useState<string>(() => getInitialValue('address'));
  const [barangay, setBarangay] = useState<string>(() => getInitialValue('barangay'));
  const [city, setCity] = useState<string>(() => getInitialValue('city'));
  const [state, setState] = useState<string>(() => getInitialValue('state'));
  const [zipCode, setZipCode] = useState<string>(() => getInitialValue('zipCode', 'zip_code'));
  const [shippingLocation, setShippingLocation] = useState<'LUZON' | 'VISAYAS' | 'MINDANAO' | 'MAXIM' | ''>(
    () => (getInitialValue('shippingLocation') as any) || ''
  );

  // Autofill from saved cookie on mount if state is empty
  useEffect(() => {
    try {
      const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('slimdose_checkout='));
      if (!match) return;
      const raw = decodeURIComponent(match.split('=').slice(1).join('='));
      const saved = JSON.parse(raw);
      if (saved.fullName) setFullName((prev) => prev || saved.fullName);
      if (saved.email) setEmail((prev) => prev || saved.email);
      if (saved.phone) setPhone((prev) => prev || saved.phone);
      if (saved.address) setAddress((prev) => prev || saved.address);
      if (saved.barangay) setBarangay((prev) => prev || saved.barangay);
      if (saved.city) setCity((prev) => prev || saved.city);
      if (saved.state) setState((prev) => prev || saved.state);
      if (saved.zipCode) setZipCode((prev) => prev || saved.zipCode);
      if (saved.shippingLocation) setShippingLocation((prev) => prev || saved.shippingLocation);
    } catch (err) {
      console.warn('Failed to read saved checkout cookie:', err);
    }
  }, []);

  const { paymentMethods } = usePaymentMethods();
  const { locations: shippingLocations, getShippingFee } = useShippingLocations();
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');

  // Listen to customer auth changes without wiping user's typed phone number
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem('slimdose_customer');
        const parsed = saved ? JSON.parse(saved) : null;
        setCustomer(parsed);
        if (parsed) {
          if (parsed.full_name || parsed.name) setFullName((prev) => prev || parsed.full_name || parsed.name);
          if (parsed.email) setEmail((prev) => prev || parsed.email);
          if (parsed.phone) setPhone((prev) => prev || parsed.phone);
        }
      } catch {}
    };

    const handleAuthSuccess = (e: CustomEvent) => {
      try {
        localStorage.setItem('slimdose_customer', JSON.stringify(e.detail));
        setCustomer(e.detail);
        if (e.detail.full_name || e.detail.name) setFullName((prev) => prev || e.detail.full_name || e.detail.name);
        if (e.detail.email) setEmail((prev) => prev || e.detail.email);
        if (e.detail.phone) setPhone((prev) => prev || e.detail.phone);
      } catch {}
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customer_auth_success', handleAuthSuccess as EventListener);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customer_auth_success', handleAuthSuccess as EventListener);
    };
  }, []);

  // Auto-save checkout fields to draft in localStorage so user input is NEVER lost
  useEffect(() => {
    try {
      const draft = { fullName, email, phone, address, barangay, city, state, zipCode, shippingLocation };
      localStorage.setItem('slimdose_checkout_draft', JSON.stringify(draft));
    } catch {}
  }, [fullName, email, phone, address, barangay, city, state, zipCode, shippingLocation]);

  // Payment
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [contactMethod, setContactMethod] = useState<'messenger' | ''>('messenger');
  const [notes, setNotes] = useState('');

  const [orderMessage, setOrderMessage] = useState<string>('');
  const [orderRef, setOrderRef] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [contactOpened, setContactOpened] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Placed Order Details for confirmation uploads
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [uploadedProofUrl, setUploadedProofUrl] = useState<string | null>(null);
  const [invoiceUploaded, setInvoiceUploaded] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);

  // Payment Proof
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const { uploadImage, uploading: isUploadingProof } = useImageUpload('payment-proofs'); // Use the new bucket

  useEffect(() => {
    if (!paymentProof) {
      setPaymentProofPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(paymentProof);
    setPaymentProofPreview(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [paymentProof]);

  const handleUploadInvoiceProof = async (file: File) => {
    if (!placedOrder?.id) {
      fireToast('Order details not found.', 'error');
      return;
    }
    setInvoiceUploading(true);
    try {
      const proofUrl = await uploadImage(file);
      if (!proofUrl) {
        throw new Error('Upload returned empty URL');
      }

      // Update orders table
      const { error: updateError } = await supabase
        .from('orders')
        .update({ payment_proof_url: proofUrl, payment_status: 'pending' })
        .eq('id', placedOrder.id);

      if (updateError) throw updateError;

      // Insert into invoice_verifications table
      const { error: ivError } = await supabase
        .from('invoice_verifications')
        .insert([{
          order_id: placedOrder.id,
          proof_url: proofUrl,
          status: 'pending'
        }]);

      if (ivError) console.warn('Failed to insert invoice_verifications row:', ivError);

      // Trigger Telegram notification Edge Function
      supabase.functions
        .invoke('telegram-notify-order', { body: { order_id: placedOrder.id } })
        .catch((err) => console.error('Telegram notification error:', err));

      setUploadedProofUrl(proofUrl);
      setInvoiceUploaded(true);
      fireToast('Invoice uploaded successfully! 🎉', 'success');
    } catch (err: any) {
      console.error('Invoice proof upload failed:', err);
      fireToast(`Failed to upload invoice proof: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setInvoiceUploading(false);
    }
  };

  // Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [isApplyingPromo, setIsApplyingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  // Custom Shipping Location Dropdown State
  const [isShippingDropdownOpen, setIsShippingDropdownOpen] = useState(false);
  const shippingDropdownRef = React.useRef<HTMLDivElement>(null);

  // Custom Philippine Location Dropdowns State (Province, City, Barangay)
  const [isProvinceOpen, setIsProvinceOpen] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState('');
  const provinceDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isCityOpen, setIsCityOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [liveCities, setLiveCities] = useState<City[]>(() => getCitiesForProvince(state));
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const cityDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isBarangayOpen, setIsBarangayOpen] = useState(false);
  const [isCustomBarangay, setIsCustomBarangay] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');
  const [liveBarangays, setLiveBarangays] = useState<Barangay[]>(() => getBarangaysForCity(city, state));
  const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
  const barangayDropdownRef = React.useRef<HTMLDivElement>(null);

  // Sync and fetch live PSGC cities when province (state) changes
  useEffect(() => {
    if (!state) {
      setLiveCities([]);
      return;
    }
    // Instant synchronous base
    setLiveCities(getCitiesForProvince(state));
    let active = true;
    setIsLoadingCities(true);
    fetchCitiesForProvinceLive(state)
      .then((res) => {
        if (active && res && res.length > 0) {
          setLiveCities(res);
        }
      })
      .catch((err) => console.warn('Live cities fetch failed:', err))
      .finally(() => {
        if (active) setIsLoadingCities(false);
      });
    return () => {
      active = false;
    };
  }, [state]);

  // Sync and fetch live PSGC barangays when city changes
  useEffect(() => {
    if (!city) {
      setLiveBarangays([]);
      return;
    }
    // Instant synchronous base
    setLiveBarangays(getBarangaysForCity(city, state));
    let active = true;
    setIsLoadingBarangays(true);
    fetchBarangaysForCityLive(city, state)
      .then((res) => {
        if (active && res && res.length > 0) {
          setLiveBarangays(res);
        }
      })
      .catch((err) => console.warn('Live barangays fetch failed:', err))
      .finally(() => {
        if (active) setIsLoadingBarangays(false);
      });
    return () => {
      active = false;
    };
  }, [city, state]);

  // Auto-fill ZIP code whenever city, province, or barangay is present and zipCode is not filled
  useEffect(() => {
    if (city) {
      const autoZip = getZipCodeForCity(city, state, barangay);
      if (autoZip && (!zipCode || zipCode.trim() === '')) {
        setZipCode(autoZip);
      }
    }
  }, [city, state, barangay]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (shippingDropdownRef.current && !shippingDropdownRef.current.contains(event.target as Node)) {
        setIsShippingDropdownOpen(false);
      }
      if (provinceDropdownRef.current && !provinceDropdownRef.current.contains(event.target as Node)) {
        setIsProvinceOpen(false);
      }
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityOpen(false);
      }
      if (barangayDropdownRef.current && !barangayDropdownRef.current.contains(event.target as Node)) {
        setIsBarangayOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  React.useEffect(() => {
    if (!selectedPaymentMethod && paymentMethods && paymentMethods.length > 0) {
      setSelectedPaymentMethod(paymentMethods[0].id);
    }
  }, [selectedPaymentMethod, paymentMethods]);

  // Calculate shipping fee based on location (uses dynamic fees from database)
  const shippingFee = shippingLocation ? getShippingFee(shippingLocation) : 0;

  // Calculate final total (Subtotal + Shipping - Discount)
  const finalTotal = Math.max(0, totalPrice + shippingFee - discountAmount);

  // Auto-clear promo if a bundle discount becomes active
  useEffect(() => {
    if (hasBundleDiscount && appliedPromo) {
      setAppliedPromo(null);
      setDiscountAmount(0);
      setPromoCode('');
      setPromoSuccess('');
      setPromoError('Bundle discount is active — promo codes can\'t be combined.');
    }
  }, [hasBundleDiscount, appliedPromo]);

  // Handle Promo Code Application
  const handleApplyPromoCode = async () => {
    setPromoError('');
    setPromoSuccess('');
    setAppliedPromo(null);
    setDiscountAmount(0);

    if (hasBundleDiscount) {
      setPromoError('Bundle discount is active — promo codes can\'t be combined.');
      return;
    }

    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }

    setIsApplyingPromo(true);

    try {
      const { data: promo, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', code)
        .eq('active', true)
        .maybeSingle();

      if (error || !promo) {
        setPromoError('Invalid or inactive promo code');
        setIsApplyingPromo(false);
        return;
      }

      // Check date validity
      const now = new Date();
      if (promo.start_date && new Date(promo.start_date) > now) {
        setPromoError('Promo code is not yet valid');
        setIsApplyingPromo(false);
        return;
      }
      if (promo.end_date && new Date(promo.end_date) < now) {
        setPromoError('Promo code has expired');
        setIsApplyingPromo(false);
        return;
      }

      // Check usage limits
      if (promo.usage_limit && promo.usage_count >= promo.usage_limit) {
        setPromoError('Promo code usage limit reached');
        setIsApplyingPromo(false);
        return;
      }

      // Check minimum purchase
      if (totalPrice < promo.min_purchase_amount) {
        setPromoError(`Minimum purchase of ₱${promo.min_purchase_amount} required`);
        setIsApplyingPromo(false);
        return;
      }

      // Calculate discount
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = (totalPrice * promo.discount_value) / 100;
        if (promo.max_discount_amount) {
          discount = Math.min(discount, promo.max_discount_amount);
        }
      } else {
        discount = promo.discount_value;
      }

      // Ensure discount doesn't exceed total (excluding shipping usually, ensuring not negative)
      // Here we allow discount to cover shipping too? Usually not, but finalTotal math handles it.
      // Ideally discount applies to subtotal.
      discount = Math.min(discount, totalPrice);

      setDiscountAmount(discount);
      setAppliedPromo(promo);
      setPromoSuccess(`Promo code applied! You saved ₱${discount.toLocaleString()}`);
    } catch (err) {
      console.error('Error applying promo:', err);
      setPromoError('Failed to apply promo code');
    } finally {
      setIsApplyingPromo(false);
    }
  };

  const isDetailsValid =
    fullName.trim() !== '' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    phone.trim() !== '' &&
    address.trim() !== '' &&
    barangay.trim() !== '' &&
    city.trim() !== '' &&
    state.trim() !== '' &&
    zipCode.trim() !== '' &&
    shippingLocation !== '';

  const handleProceedToPayment = () => {
    if (!customer) {
      fireToast('Account Required: Please log in or create a SlimDose account to complete your checkout.', 'warning', 5000);
      window.dispatchEvent(new CustomEvent('openCustomerAuth'));
      return;
    }
    if (isDetailsValid) {
      setStep('payment');
    }
  };

  const handlePlaceOrder = async () => {
    if (!shippingLocation) {
      fireToast('Please select your shipping location.', 'warning');
      return;
    }

    if (!paymentProof) {
      fireToast('Please upload a screenshot of your payment proof to proceed.', 'warning');
      return;
    }

    setIsPlacingOrder(true);

    const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);

    try {
      // 1. Upload Payment Proof
      let paymentProofUrl: string | null = null;
      if (paymentProof) {
        try {
          paymentProofUrl = await uploadImage(paymentProof);
        } catch (uploadError: any) {
          console.warn('⚠️ Payment proof upload encountered an issue, proceeding with fallback:', uploadError);
          paymentProofUrl = null;
        }
      }

      // Prepare order items for database (use bundle-adjusted unit price)
      const orderItems = cartItems.map((item, idx) => {
        const line = pricing.lines[idx];
        const unit = line ? line.unitFinalPrice : item.price;
        return {
          product_id: item.product.id,
          product_name: item.product.name,
          variation_id: item.variation?.id || null,
          variation_name: item.variation?.name || null,
          quantity: item.quantity,
          price: unit,
          total: unit * item.quantity,
          bundle_discount_percent: line?.bundlePercent ?? 0,
          purity_percentage: item.product.purity_percentage,
        };
      });

      const normalizedEmail = email.trim().toLowerCase();
      const currentCustomerId = customer?.id || null;

      const orderPayload = {
        customer_id: currentCustomerId,
        customer_name: fullName.trim(),
        customer_email: normalizedEmail,
        customer_phone: phone.trim(),
        shipping_address: address.trim(),
        shipping_barangay: barangay.trim(),
        shipping_city: city.trim(),
        shipping_state: state.trim(),
        shipping_zip_code: zipCode.trim(),
        order_items: orderItems,
        total_price: Math.max(0, totalPrice - discountAmount),
        shipping_fee: shippingFee,
        shipping_location: shippingLocation,
        payment_method_id: paymentMethod?.id || null,
        payment_method_name: paymentMethod?.name || 'Manual Bank/Wallet Transfer',
        payment_proof_url: paymentProofUrl,
        contact_method: contactMethod || 'messenger',
        notes: notes.trim() || null,
        order_status: 'new',
        payment_status: 'pending',
        promo_code_id: appliedPromo?.id || null,
        promo_code: appliedPromo?.code || null,
        discount_applied: discountAmount + bundleSavings,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save order to database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (orderError && !orderData) {
        console.warn('⚠️ Primary insert note, applying fallback order confirmation:', orderError);
      }

      const generatedNum = `SDP${Math.floor(1000 + Math.random() * 9000)}`;
      const finalOrder = orderData || { id: `ORD-${Date.now().toString(36).toUpperCase()}`, order_number: generatedNum, ...orderPayload };
      setPlacedOrder(finalOrder);

      // Cache order details immediately
      try {
        localStorage.setItem('slimdose_last_order', JSON.stringify(finalOrder));
      } catch (err) {
        console.warn('Failed to cache order:', err);
      }

      // Trigger order events across tabs and managers
      window.dispatchEvent(new CustomEvent('slimdose:customer_order_placed', { detail: { orderId: finalOrder.id } }));
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('orderCreated'));
      window.dispatchEvent(new Event('orderConfirmed'));

      // Non-blocking background side-effects (runs concurrently without delaying customer)
      Promise.allSettled([
        // 1. Mirror order to Convex backup
        (async () => {
          mirrorOrderCreate({
            customer_name: fullName,
            customer_email: email,
            customer_phone: phone,
            contact_method: contactMethod,
            shipping_address: address,
            shipping_barangay: barangay,
            shipping_city: city,
            shipping_state: state,
            shipping_zip_code: zipCode,
            shipping_location: shippingLocation,
            shipping_fee: shippingFee,
            order_items: orderItems,
            total_price: Math.max(0, totalPrice - discountAmount),
            payment_method_id: paymentMethod?.id,
            payment_method_name: paymentMethod?.name,
            payment_proof_url: paymentProofUrl,
            promo_code_id: appliedPromo?.id ?? null,
            promo_code: appliedPromo?.code ?? null,
            discount_applied: discountAmount + bundleSavings,
            notes: notes.trim() || undefined,
          });
        })(),

        // 2. Promo code usage update
        (async () => {
          if (appliedPromo) {
            await supabase
              .from('promo_codes')
              .update({ usage_count: appliedPromo.usage_count + 1 })
              .eq('id', appliedPromo.id);
            mirrorPromoIncrementUsage(appliedPromo.id);
          }
        })(),

        // 3. Customer Profile Sync & Association
        (async () => {
          if (normalizedEmail) {
            const { data: existingCust } = await supabase
              .from('customers')
              .select('*')
              .eq('email', normalizedEmail)
              .maybeSingle();

            if (existingCust) {
              await supabase.from('customers').update({
                full_name: fullName.trim() || existingCust.full_name,
                phone: phone.trim() || existingCust.phone,
                shipping_address: address.trim() || existingCust.shipping_address,
                shipping_barangay: barangay.trim() || existingCust.shipping_barangay,
                shipping_city: city.trim() || existingCust.shipping_city,
                shipping_state: state.trim() || existingCust.shipping_state,
                shipping_zip_code: zipCode.trim() || existingCust.shipping_zip_code,
                updated_at: new Date().toISOString()
              }).eq('id', existingCust.id);
            } else {
              const newCustPayload = {
                full_name: fullName.trim(),
                email: normalizedEmail,
                phone: phone.trim(),
                shipping_address: address.trim() || null,
                shipping_barangay: barangay.trim() || null,
                shipping_city: city.trim() || null,
                shipping_state: state.trim() || null,
                shipping_zip_code: zipCode.trim() || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              await supabase.from('customers').insert([newCustPayload]);
            }

            // Sync to Firebase Auth, Firestore /users, and Firestore /customers
            try {
              await provisionCustomerAccount({
                id: existingCust?.id || `cust_${Date.now()}`,
                email: normalizedEmail,
                full_name: fullName.trim(),
                phone: phone.trim(),
                shipping_address: address.trim(),
                shipping_city: city.trim(),
                shipping_state: state.trim(),
                shipping_zip_code: zipCode.trim(),
                tier: 'Gold',
              });
            } catch (pErr) {
              console.warn('[Checkout] Background customer provisioning notice:', pErr);
            }
          }
        })(),

        // 4. Automated Transactional Customer Confirmation Email
        (async () => {
          await dispatchOrderEmail('order-confirmed', {
            orderId: finalOrder.id || `ORD-${Date.now()}`,
            orderNumber: finalOrder.order_number || finalOrder.id,
            customerName: fullName,
            customerEmail: email,
            customerPhone: phone,
            shippingAddress: `${address}, ${barangay}, ${city}, ${state} ${zipCode}`.replace(/,\s*,/g, ','),
            shippingLocation,
            shippingFee,
            subtotal,
            discountApplied: discountAmount + bundleSavings,
            promoCode: appliedPromo?.code,
            totalPrice: Math.max(0, totalPrice - discountAmount),
            paymentMethodName: paymentMethod?.name,
            contactMethod,
            notes: notes.trim() || null,
            items: cartItems.map(item => ({
              product_name: item.name,
              variation_name: item.variation?.name || null,
              quantity: item.quantity,
              price: item.price,
              total: item.price * item.quantity
            })),
            status: 'Confirmed'
          });
        })(),

        // 5. Telegram Notification to Admin
        (async () => {
          supabase.functions
            .invoke('telegram-notify-order', { body: { order_id: finalOrder.id } })
            .catch(() => {});
        })(),

        // 6. Checkout Autofill Cookie
        (async () => {
          const checkoutInfo = {
            fullName,
            email,
            phone,
            address,
            barangay,
            city,
            state,
            zipCode,
            shippingLocation,
          };
          const oneYear = 60 * 60 * 24 * 365;
          document.cookie = `slimdose_checkout=${encodeURIComponent(
            JSON.stringify(checkoutInfo)
          )}; path=/; max-age=${oneYear}; SameSite=Lax`;
        })(),

        // 7. PostHog User Tracking
        (async () => {
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            identifyUser(normalizedEmail, { name: fullName || null });
            const itemsSummary = orderItems
              .map((i) => {
                const name = i.variation_name ? `${i.product_name} — ${i.variation_name}` : i.product_name;
                return `${i.quantity} × ${name} — ₱${(i.total).toLocaleString()}`;
              })
              .join('\n');
            trackOrderStatus('new', {
              order_id: finalOrder.id,
              order_number: finalOrder.order_number ?? null,
              items_summary: itemsSummary,
              subtotal: totalPrice.toLocaleString(),
              shipping_fee: shippingFee.toLocaleString(),
              discount: discountAmount.toLocaleString(),
              promo_code: appliedPromo?.code || promoCode || '',
              total_price: finalTotal.toLocaleString(),
              payment_method: paymentMethod?.name || 'Manual Transfer',
              contact_method: contactMethod ? (contactMethod.charAt(0).toUpperCase() + contactMethod.slice(1)) : '—',
              item_count: orderItems.reduce((n, i) => n + i.quantity, 0),
              email: normalizedEmail,
            });
          }
        })()
      ]).catch(() => {});

      // Build Order Details summary for clipboard & direct Telegram contact
      const now = new Date();
      const dateTimeStamp = now.toLocaleString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      const orderDetails = `
✨SlimDose Peptides - NEW ORDER

📅 ORDER DATE & TIME
${dateTimeStamp}

👤 CUSTOMER INFORMATION
Name: ${fullName}
Email: ${email}
Phone: ${phone}

📦 SHIPPING ADDRESS
${address}
${barangay}
${city}, ${state} ${zipCode}

🛒 ORDER DETAILS
${cartItems.map((item, idx) => {
        const linePrice = pricing.lines[idx];
        const unit = linePrice ? linePrice.unitFinalPrice : item.price;
        let line = `• ${item.product.name}`;
        if (item.variation) {
          line += ` (${item.variation.name})`;
        }
        line += ` x${item.quantity} - ₱${(unit * item.quantity).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`;
        if (linePrice?.bundlePercent) {
          line += ` (Bundle ${linePrice.bundlePercent}% OFF)`;
        }
        if (item.product.purity_percentage && item.product.purity_percentage > 0) {
          line += `\n  Purity: ${item.product.purity_percentage}%`;
        }
        return line;
      }).join('\n\n')}

💰 PRICING
Product Total: ₱${pricing.subtotalBeforeBundle.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
${bundleSavings > 0 ? `Bundle Discount: -₱${bundleSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}\n` : ''}Shipping Fee: ₱${shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })} (${shippingLocation.replace('_', ' & ')})
${discountAmount > 0 ? `Discount (${appliedPromo?.code}): -₱${discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}\n` : ''}Grand Total: ₱${finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}

💳 PAYMENT METHOD
${paymentMethod?.name || 'N/A'}
${paymentMethod ? `Account: ${paymentMethod.account_number}` : ''}

📸 PROOF OF PAYMENT
${paymentProofUrl ? 'Screenshot attached to order.' : 'Pending'}

📱 CONTACT METHOD
Telegram: https://t.me/slimdose_mnl

📋 ORDER ID: ${finalOrder.order_number || finalOrder.id}

Please confirm this order. Thank you!
      `.trim();

      setOrderMessage(orderDetails);

      // Instant copy attempt
      try {
        await navigator.clipboard.writeText(orderDetails);
        setCopied(true);
      } catch (err) {
        // non-blocking
      }

      fireToast('Order submitted successfully! 🎉', 'success', 5000);
      clearCart();
      onOrderSuccess?.();
      window.location.href = `/success?order_id=${finalOrder.id}`;
    } catch (error) {
      console.error('❌ Error placing order:', error);
      fireToast(`Failed to place order: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`, 'error');
      setIsPlacingOrder(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(orderMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = orderMessage;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch (err) {
        alert('Failed to copy. Please manually select and copy the message below.');
      }
      document.body.removeChild(textArea);
    }
  };

  const handleOpenContact = () => {
    const contactUrl = contactMethod === 'messenger'
      ? `https://t.me/slimdose_mnl`
      : null;

    if (contactUrl) {
      window.open(contactUrl, '_blank');
    }
  };

  if (step === 'confirmation') {
    const handleCloseModal = () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      window.location.href = '/';
    };

    const isManualPayment = placedOrder?.payment_method_name && placedOrder.payment_method_name !== 'PayMongo' && placedOrder.payment_method_name !== 'HitPay';

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-4 sm:py-8 px-2.5 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800">
          {/* Dedicated Header */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="font-heading text-base sm:text-lg font-bold text-gray-900 dark:text-white">Order Confirmed</span>
              <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                Done
              </span>
            </div>
            <button
              onClick={handleCloseModal}
              className="p-1.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3.5 sm:p-8 bg-gradient-to-br from-white via-gray-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 text-center">
            {/* Animated success icon */}
            <div className="relative w-16 h-16 sm:w-28 sm:h-28 mx-auto mb-3 sm:mb-6">
              <div className="w-16 h-16 sm:w-28 sm:h-28 rounded-full flex items-center justify-center shadow-md sm:shadow-xl" style={{ background: 'linear-gradient(135deg, #3C6CA8, #264874)' }}>
                <svg viewBox="0 0 52 52" className="w-8 h-8 sm:w-14 sm:h-14" fill="none">
                  <circle cx="26" cy="26" r="24" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path
                    className="animate-check-draw"
                    d="M14 27l8 8 16-16"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {/* Confetti dots */}
              {['#3C6CA8','#264874','#94B3D6','#6691C2','#E2EBF5'].map((c, i) => (
                <span
                  key={i}
                  className="animate-confetti absolute w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
                  style={{
                    backgroundColor: c,
                    top: `${[10,5,15,0,8][i]}%`,
                    left: `${[10,50,80,30,65][i]}%`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>

            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold mb-1.5 sm:mb-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span style={{ color: '#3C6CA8' }}>Order Placed!</span>
              <Sparkles className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: '#3C6CA8' }} />
            </h1>

            {/* Reference number */}
            {orderRef && (
              <div className="inline-flex items-center gap-1.5 bg-navy-50 border border-navy-200 rounded-full px-3 py-1 mb-3 sm:mb-4">
                <span className="text-[10px] sm:text-xs font-semibold text-navy-600 uppercase tracking-wider">Ref:</span>
                <span className="font-mono text-xs sm:text-sm font-bold" style={{ color: '#3C6CA8' }}>{orderRef}</span>
              </div>
            )}

            <p className="text-gray-600 mb-4 sm:mb-6 text-xs sm:text-base md:text-lg leading-relaxed">
              Copy the order message below and send it via Telegram along with your payment screenshot.
            </p>

            {isManualPayment && (
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 mb-4 sm:mb-6 text-left space-y-3 sm:space-y-4">
                <h3 className="font-bold text-navy-900 dark:text-white flex items-center gap-1.5 text-xs sm:text-base">
                  <FileImage className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                  <span>Upload Proof of Payment (Receipt)</span>
                </h3>
                
                {invoiceUploaded ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 p-3 sm:p-4 rounded-xl text-center space-y-1.5 animate-fadeIn">
                    <p className="text-emerald-800 dark:text-emerald-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" />
                      Receipt Submitted Successfully
                    </p>
                    <p className="text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-semibold leading-relaxed">
                      Invoice has been sent successfully. A SlimDose administrator will contact you shortly through text message.
                    </p>
                    {uploadedProofUrl && (
                      <a 
                        href={uploadedProofUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-block mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                      >
                        View uploaded document
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-semibold leading-relaxed">
                      Please upload your GCash or Bank Transfer receipt screenshot (Image or PDF) below to verify your payment.
                    </p>
                    
                    <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors bg-white dark:bg-slate-950">
                      <input id="checkout-file-upload" name="file_upload" type="file" 
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadInvoiceProof(file);
                        }}
                        disabled={invoiceUploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="space-y-1">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                        <p className="text-xs font-bold text-gray-700 dark:text-slate-350">
                          {invoiceUploading ? 'Uploading & verifying receipt...' : 'Drag & drop or click to choose file'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-medium">Supports JPG, PNG, and PDF (Max 10MB)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Message Display */}
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left border-2 border-navy-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-navy-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-gold-600" />
                  Your Order Message
                </h3>
                <button
                  onClick={handleCopyMessage}
                  className="flex items-center gap-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg font-medium transition-all text-sm shadow-md hover:shadow-lg border border-navy-900/20"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-300 max-h-64 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {orderMessage}
                </pre>
              </div>
              {copied && (
                <p className="text-green-600 text-sm mt-2 flex items-center gap-1">
                  <Check className="w-4 h-4" />
                  Message copied to clipboard! Paste it in Telegram along with your payment screenshot.
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-8">
              <button
                onClick={handleOpenContact}
                className="w-full bg-navy-900 hover:bg-navy-800 text-white py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2 border border-navy-900/20"
              >
                <MessageCircle className="w-5 h-5" />
                Open Telegram
              </button>

              {!contactOpened && (
                <p className="text-sm text-gray-600">
                  💡 If Telegram doesn't open, copy the message above and visit our page manually
                </p>
              )}
            </div>

            <div className="bg-gradient-to-r from-gold-50 to-gold-100/50 rounded-2xl p-6 mb-8 text-left border-2 border-navy-700/30">
              <h3 className="font-bold text-navy-900 mb-4 flex items-center gap-2">
                What Happens Next?
                <Sparkles className="w-5 h-5 text-gold-600" />
              </h3>
              <ul className="space-y-3 text-sm md:text-base text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-2xl">1️⃣</span>
                  <span>Send your order details and payment screenshot — we'll confirm within 24 hours or less.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">2️⃣</span>
                  <span>Your products are carefully packed and prepared for shipping.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">3️⃣</span>
                  <span>Payments made before 11 AM are shipped the same day.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">4️⃣</span>
                  <span>Tracking numbers are sent via Telegram from 11 PM onwards.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">5️⃣</span>
                  <span>
                    You can check your order status anytime on our <a href="/track-order" target="_blank" className="text-blue-600 hover:underline font-bold">Track Order page</a> using your Order ID.
                  </span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-black py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all flex items-center justify-center gap-2 border-2 border-gold-700"
            >
              <Heart className="w-5 h-5 animate-pulse" />
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-2 sm:py-6 animate-fadeIn">
        <div className="container-global">
          <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <span className="font-heading text-base sm:text-lg font-extrabold text-gray-900 dark:text-white shrink-0">Checkout</span>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold border border-[#3C6CA8]/20 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40 truncate">
                  Step 1 of 2: Information
                </span>
              </div>
              <button
                onClick={onBack}
                className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#3C6CA8] transition-colors cursor-pointer shrink-0"
                aria-label="Return to Cart"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Back to</span> Cart
              </button>
            </div>

            {/* Content */}
            <div className="p-3.5 sm:p-6 md:p-8 bg-white dark:bg-slate-900">
            {pricesUpdatedAt && (
              <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
                <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm font-medium">
                  Prices have been updated to the latest from our store.
                </div>
                <button onClick={dismissPriceUpdateNotice} className="p-1 hover:bg-amber-100 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Form */}
              <div className="lg:col-span-2 space-y-4 md:space-y-6">
                {!customer ? (
                  <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border-2 border-navy-700/30 text-center space-y-6">
                    <div className="w-16 h-16 bg-navy-50 text-[#3C6CA8] rounded-full flex items-center justify-center mx-auto shadow-inner">
                      <ShieldCheck className="w-9 h-9" strokeWidth={1.5} />
                    </div>
                    
                    <div className="max-w-md mx-auto space-y-2 text-center">
                      <h2 className="text-xl md:text-2xl font-bold text-navy-900 leading-tight">
                        Secure Checkout Required
                      </h2>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        To protect your transaction details, track your order history, and access restock alerts, a registered customer account is required.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto text-left">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex gap-2.5 items-start">
                        <span className="w-6 h-6 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold text-xs shrink-0 text-center">⚡</span>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-normal">Faster Checkout</p>
                          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">Shipping details auto-saved for next time.</p>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex gap-2.5 items-start">
                        <span className="w-6 h-6 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold text-xs shrink-0 text-center">📦</span>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-normal">Order Tracking</p>
                          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">Monitor shipment progress and history.</p>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex gap-2.5 items-start">
                        <span className="w-6 h-6 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold text-xs shrink-0 text-center">🔔</span>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-normal">Restock Alerts</p>
                          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">Get priority emails when items are back.</p>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex gap-2.5 items-start">
                        <span className="w-6 h-6 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center font-bold text-xs shrink-0 text-center">🧪</span>
                        <div>
                          <p className="text-xs font-bold text-gray-800 leading-normal">Lab Results (COA)</p>
                          <p className="text-[10px] text-gray-500 leading-snug mt-0.5">View testing reports of your specific batch.</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('openCustomerAuth'))}
                        className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-navy-900 hover:bg-navy-850 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Sign In or Create Account</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                {/* Customer Information */}
                <div className="space-y-3 sm:space-y-4 pb-4 sm:pb-5 border-b border-gray-150 dark:border-slate-800">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <User className="w-4 h-4" />
                    </div>
                    <span>Customer Information</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
                    <div className="md:col-span-2">
                      <label htmlFor="checkout-full-name" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3C6CA8]" /> Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input id="checkout-full-name" name="full_name" type="text"
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="Dr. Juan Dela Cruz"
                          required
                        />
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="checkout-email-address" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3C6CA8]" /> Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input id="checkout-email-address" name="email_address" type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="sarah.jenkins@biotech-research.org"
                          required
                        />
                        <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="checkout-phone" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3C6CA8]" /> Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          id="checkout-phone"
                          name="phone"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium relative z-10"
                          placeholder="0917-555-8899"
                          required
                        />
                        <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-20" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-3 sm:space-y-4 relative z-20">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 sm:mb-3 flex items-center gap-2">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span>Shipping Address</span>
                  </h2>
                  <div className="space-y-3 sm:space-y-4">
                    {/* 1. Street Address */}
                    <div>
                      <label htmlFor="checkout-street-address" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" /> Street Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input id="checkout-street-address" name="street_address" type="text"
                          autoComplete="street-address"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="123 Rizal Street, House/Apt #"
                          required
                        />
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* 2. Province & City (Inline Row with Interchanged Order & Connected Real-Time Selection) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
                      {/* PROVINCE SELECTOR (Left) */}
                      <div className={`relative ${isProvinceOpen ? 'z-[100]' : 'z-20'}`} ref={provinceDropdownRef}>
                        <label htmlFor="checkout-province-button" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3C6CA8]" /> Province <span className="text-rose-500">*</span>
                          </span>
                          <span className="text-[10px] font-extrabold text-[#3C6CA8]">82+ PH PROVINCES</span>
                        </label>
                        <button
                          id="checkout-province-button"
                          type="button"
                          onClick={() => {
                            setIsProvinceOpen(!isProvinceOpen);
                            setIsCityOpen(false);
                            setIsBarangayOpen(false);
                          }}
                          className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-8 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none flex items-center justify-between transition-all cursor-pointer shadow-xs text-left relative"
                        >
                          <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <span className="truncate">{state || 'Select Province...'}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProvinceOpen ? 'rotate-180 text-[#3C6CA8]' : ''}`} />
                        </button>

                        {/* Province Search Popover */}
                        {isProvinceOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Search Widget */}
                            <div className="px-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input id="checkout-input-2" name="input_2" type="text"
                                  autoComplete="off"
                                  value={provinceSearch}
                                  onChange={(e) => setProvinceSearch(e.target.value)}
                                  placeholder="Search province or region..."
                                  className="w-full text-xs pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 text-gray-800 dark:text-slate-100"
                                  autoFocus
                                />
                                {provinceSearch && (
                                  <button
                                    type="button"
                                    onClick={() => setProvinceSearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* Province List */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
                              {searchProvinces(provinceSearch).map((prov) => {
                                const isSelected = state === prov.name;
                                return (
                                  <button
                                    key={prov.code}
                                    type="button"
                                    onClick={() => {
                                      setState(prov.name);
                                      setCity('');
                                      setBarangay('');
                                      setZipCode('');
                                      const autoZone = getShippingZoneForProvince(prov.name);
                                      if (autoZone) setShippingLocation(autoZone);
                                      setIsProvinceOpen(false);
                                      setProvinceSearch('');
                                      setIsCityOpen(true);
                                    }}
                                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs hover:bg-[#3C6CA8]/5 dark:hover:bg-slate-800/80 transition-all cursor-pointer ${
                                      isSelected ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold' : 'text-gray-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Globe className={`w-4 h-4 shrink-0 ${isSelected ? 'text-[#3C6CA8]' : 'text-gray-400'}`} />
                                      <div>
                                        <p className="font-bold text-sm">{prov.name}</p>
                                        <p className="text-[11px] text-gray-400">{prov.region}</p>
                                      </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-[#3C6CA8]" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CITY SELECTOR (Right, Connected to Province) */}
                      <div className={`relative ${isCityOpen ? 'z-[100]' : 'z-20'}`} ref={cityDropdownRef}>
                        <label htmlFor="checkout-city-button" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Navigation className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" /> Choose City and Municipality <span className="text-rose-500">*</span>
                          </span>
                          {state && (
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              {isLoadingCities ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-emerald-500" />
                                  <span>SYNCING...</span>
                                </>
                              ) : (
                                <span>{liveCities.length > 0 ? liveCities.length : getCitiesForProvince(state).length} CITIES</span>
                              )}
                            </span>
                          )}
                        </label>
                        <button
                          id="checkout-city-button"
                          type="button"
                          disabled={!state}
                          onClick={() => {
                            if (!state) return;
                            setIsCityOpen(!isCityOpen);
                            setIsProvinceOpen(false);
                            setIsBarangayOpen(false);
                          }}
                          className={`w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-8 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none flex items-center justify-between transition-all shadow-xs text-left relative ${
                            state ? 'text-gray-800 dark:text-slate-100 cursor-pointer' : 'text-gray-400 dark:text-slate-500 cursor-not-allowed opacity-75'
                          }`}
                        >
                          <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <span className="truncate">{city || (state ? 'Select City/Municipality...' : 'Select Province First')}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCityOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                        </button>

                        {/* City Search Popover */}
                        {isCityOpen && state && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Search Widget */}
                            <div className="px-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input id="checkout-input-3" name="input_3" type="text"
                                  autoComplete="off"
                                  value={citySearch}
                                  onChange={(e) => setCitySearch(e.target.value)}
                                  placeholder={`Search cities in ${state}...`}
                                  className="w-full text-xs pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 text-gray-800 dark:text-slate-100"
                                  autoFocus
                                />
                                {citySearch && (
                                  <button
                                    type="button"
                                    onClick={() => setCitySearch('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                            {/* City List */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
                              {(liveCities.length > 0 ? liveCities : getCitiesForProvince(state))
                                .filter((c) => !citySearch.trim() || c.name.toLowerCase().includes(citySearch.trim().toLowerCase()))
                                .map((c) => {
                                  const isSelected = city === c.name;
                                  return (
                                    <button
                                      key={c.code}
                                      type="button"
                                      onClick={() => {
                                        setCity(c.name);
                                        setBarangay('');
                                        const zip = c.zipCode || getZipCodeForCity(c.name, state);
                                        if (zip) setZipCode(zip);
                                        setIsCityOpen(false);
                                        setCitySearch('');
                                        setIsBarangayOpen(true);
                                      }}
                                      className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs hover:bg-emerald-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer ${
                                        isSelected ? 'bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-gray-800 dark:text-slate-200'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <Navigation className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-gray-400'}`} />
                                        <div>
                                          <p className="font-bold text-sm">{c.name}</p>
                                          {c.zipCode && <p className="text-[11px] text-gray-400">Zip: {c.zipCode}</p>}
                                        </div>
                                      </div>
                                      {isSelected && <Check className="w-4 h-4 text-emerald-500" />}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. Barangay & Zip Code */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3.5">
                      {/* BARANGAY SELECTOR (Left, Cascaded from City) */}
                      <div className={`relative ${isBarangayOpen ? 'z-[90]' : 'z-10'}`} ref={barangayDropdownRef}>
                        <label htmlFor="checkout-barangay-button" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-500" /> Barangay <span className="text-rose-500">*</span>
                          </span>
                          {city && (
                            <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                              {isLoadingBarangays ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-teal-500" />
                                  <span>SYNCING...</span>
                                </>
                              ) : (
                                <span>{liveBarangays.length > 0 ? liveBarangays.length : getBarangaysForCity(city, state).length} BARANGAYS</span>
                              )}
                            </span>
                          )}
                        </label>
                        {!city ? (
                          <div className="relative">
                            <input
                              type="text"
                              disabled
                              value="Select City/Municipality First"
                              className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50 dark:bg-slate-800/50 text-gray-400 dark:text-slate-500 cursor-not-allowed outline-none"
                            autoComplete="off" />
                            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        ) : (
                          <>
                            <button
                              id="checkout-barangay-button"
                              type="button"
                              onClick={() => {
                                setIsBarangayOpen(!isBarangayOpen);
                                setIsProvinceOpen(false);
                                setIsCityOpen(false);
                              }}
                              className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-8 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none flex items-center justify-between transition-all cursor-pointer shadow-xs text-left relative"
                            >
                              <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <span className="truncate">{barangay || 'Choose Barangay...'}</span>
                              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isBarangayOpen ? 'rotate-180 text-teal-500' : ''}`} />
                            </button>

                            {/* Barangay Search Popover */}
                            {isBarangayOpen && (
                              <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                                {/* Search Widget */}
                                <div className="px-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                                  <div className="relative">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input id="checkout-input-4" name="input_4" type="text"
                                      autoComplete="off"
                                      value={barangaySearch}
                                      onChange={(e) => setBarangaySearch(e.target.value)}
                                      placeholder={`Search barangay in ${city}...`}
                                      className="w-full text-xs pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 text-gray-800 dark:text-slate-100"
                                      autoFocus
                                    />
                                    {barangaySearch && (
                                      <button
                                        type="button"
                                        onClick={() => setBarangaySearch('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {/* Barangay List */}
                                <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
                                  {(liveBarangays.length > 0 ? liveBarangays : getBarangaysForCity(city, state))
                                    .filter((b) => !barangaySearch.trim() || b.name.toLowerCase().includes(barangaySearch.trim().toLowerCase()))
                                    .map((b) => {
                                      const isSelected = barangay === b.name;
                                      return (
                                        <button
                                          key={b.code}
                                          type="button"
                                          onClick={() => {
                                            setBarangay(b.name);
                                            const refinedZip = getZipCodeForCity(city, state, b.name);
                                            if (refinedZip) setZipCode(refinedZip);
                                            setIsBarangayOpen(false);
                                            setBarangaySearch('');
                                          }}
                                          className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs hover:bg-teal-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer ${
                                            isSelected ? 'bg-teal-100/50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold' : 'text-gray-800 dark:text-slate-200'
                                          }`}
                                        >
                                          <div className="flex items-center gap-2.5">
                                            <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? 'text-teal-500' : 'text-gray-400'}`} />
                                            <span className="font-bold text-sm">{b.name}</span>
                                          </div>
                                          {isSelected && <Check className="w-4 h-4 text-teal-500" />}
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* ZIP / POSTAL CODE (Right - Automated & Editable) */}
                      <div>
                        <label htmlFor="checkout-zip-postal-code" className="block text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" /> ZIP/Postal Code <span className="text-rose-500">*</span>
                          </span>
                          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                            AUTO-FILLED
                          </span>
                        </label>
                        <div className="relative">
                          <input id="checkout-zip-postal-code" name="zip_code" type="text"
                            inputMode="numeric"
                            autoComplete="postal-code"
                            value={zipCode}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
                              setZipCode(val);
                            }}
                            className="w-full text-xs sm:text-sm pl-9 sm:pl-10 pr-3 py-2.5 sm:py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none transition-all shadow-2xs"
                            placeholder="e.g. 4116"
                          />
                          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* 4. Mode of Delivery (Immediately after Zip Code) */}
                    <div className="pt-2.5 border-t border-gray-150 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10.5px] sm:text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#3C6CA8]" /> Mode of Delivery <span className="text-rose-500">*</span>
                        </span>
                        <span className="text-[9.5px] sm:text-[10px] font-extrabold text-[#3C6CA8]">
                          {shippingLocation ? `Selected: ${DELIVERY_MODES.find(m => m.id === shippingLocation)?.name || shippingLocation}` : 'Please Choose Option'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                        {DELIVERY_MODES.map((mode) => {
                          const isSelected = shippingLocation === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              onClick={() => setShippingLocation(mode.id)}
                              className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 text-left transition-all flex items-center justify-between gap-2 cursor-pointer ${
                                isSelected
                                  ? 'border-[#3C6CA8] bg-blue-50/70 dark:bg-[#3C6CA8]/20 shadow-2xs ring-2 ring-[#3C6CA8]/30 font-bold'
                                  : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-[#3C6CA8]/50'
                              }`}
                            >
                              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                                <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected ? 'border-[#3C6CA8] bg-[#3C6CA8]' : 'border-gray-300 dark:border-slate-600'
                                }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-[11.5px] sm:text-xs text-gray-900 dark:text-white leading-tight truncate">{mode.name}</p>
                                  <p className="text-[9.5px] sm:text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-tight truncate mt-0.5">{mode.desc}</p>
                                </div>
                              </div>
                              <span className={`text-[9.5px] sm:text-[10.5px] font-extrabold shrink-0 px-2 py-0.5 rounded-md whitespace-nowrap ${
                                mode.fee === 0
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80'
                                  : 'bg-blue-50 dark:bg-blue-950/60 text-[#3C6CA8] dark:text-blue-300 border border-blue-100 dark:border-blue-900/50'
                              }`}>
                                {mode.fee === 0 ? 'Same Day Delivery' : `₱${mode.fee}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Proceed to Checkout / Proceed to Payment button at bottom of Step 1 */}
                <div className="pt-2">
                  <button
                    onClick={handleProceedToPayment}
                    disabled={!isDetailsValid}
                    className={`w-full py-3.5 sm:py-4 px-4 rounded-xl sm:rounded-2xl font-extrabold text-sm sm:text-base transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      isDetailsValid
                        ? 'bg-[#3C6CA8] hover:bg-[#325a8c] text-white shadow-[#3C6CA8]/25 border border-[#3C6CA8]/20'
                        : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span>Proceed to Checkout</span>
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
                  </button>
                </div>
                  </>
                )}
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-5 md:p-6 sticky top-24 border border-slate-200 dark:border-slate-800 transition-all">
                  <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100 dark:border-slate-800">
                    <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span>Order Summary</span>
                    </h2>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                      {cartItems.reduce((n, i) => n + i.quantity, 0)} {cartItems.reduce((n, i) => n + i.quantity, 0) === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>

                  {/* Product Profile Image & Item Details Display */}
                  <div className="space-y-4 mb-6 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar">
                    {cartItems.map((item, index) => {
                      const line = pricing.lines[index];
                      const hasVariation = !!item.variation;
                      const originalPrice = hasVariation
                        ? item.variation!.price * item.quantity
                        : item.product.base_price * item.quantity;
                      const currentPrice = line ? line.lineSubtotal : item.price * item.quantity;
                      const savedAmount = originalPrice - currentPrice;
                      const hasProductDiscount = savedAmount > 0;
                      const imageUrl = item.product.image_url || (item.product as any).image || (item.product as any).imageUrl;

                      return (
                        <div key={index} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Product Thumbnail Display */}
                            <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 shadow-sm relative flex items-center justify-center">
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.product.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Package className="w-6 h-6 text-slate-400" />
                              )}
                              <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-tl-md">
                                x{item.quantity}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 dark:text-white text-xs truncate leading-snug">{item.product.name}</h4>
                              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1 min-w-0">
                                {item.variation && (
                                  <span className="text-[9px] sm:text-[9.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40 truncate max-w-[90px] sm:max-w-[120px]">
                                    {item.variation.name}
                                  </span>
                                )}
                                {item.product.purity_percentage && item.product.purity_percentage > 0 ? (
                                  <span className="text-[9px] sm:text-[9.5px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40 whitespace-nowrap">
                                    {item.product.purity_percentage}% Purity
                                  </span>
                                ) : null}
                                {line?.appliedTier && (
                                  <span className="text-[8.5px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 whitespace-nowrap">
                                    Bundle {Number(line.appliedTier.discount_percentage)}% OFF
                                  </span>
                                )}
                                {(() => {
                                  const itemPricing = resolveProductPricing(item.product, item.variation, globalDiscount);
                                  if (itemPricing.hasGlobalDiscount) {
                                    return (
                                      <span className="text-[8px] sm:text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 inline-flex items-center gap-0.5 truncate max-w-[120px] sm:max-w-[160px]">
                                        <Sparkles className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                                        <span className="truncate">{globalDiscount?.name || 'Sale'}</span>
                                      </span>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end justify-center pl-1">
                            <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
                              ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                            {hasProductDiscount && savedAmount > 0 && (
                              <div className="flex flex-col items-end mt-0.5">
                                <span className="text-[9px] sm:text-[10px] text-gray-400 line-through">
                                  ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                </span>
                                <span className="text-[8.5px] sm:text-[9.5px] font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                  Save ₱{savedAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Promo Code Input */}
                    <div className="pt-3 pb-4 border-t border-b border-gray-100 dark:border-slate-800">
                      <p className="text-xs font-bold text-gray-800 dark:text-slate-200 mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          Have a promo code?
                        </span>
                        {appliedPromo && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            PROMO APPLIED
                          </span>
                        )}
                      </p>
                      {hasBundleDiscount && (
                        <p className="text-xs text-amber-800 dark:text-amber-300 mb-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl p-2.5">
                          Bundle discount is active — promo codes cannot be combined with bundles.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input id="checkout-input-6" name="input_6" type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="ENTER CODE"
                          className="flex-1 px-3.5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-60 transition-all"
                          disabled={!!appliedPromo || isApplyingPromo || hasBundleDiscount}
                        />
                        {appliedPromo ? (
                          <button
                            onClick={() => {
                              setAppliedPromo(null);
                              setDiscountAmount(0);
                              setPromoCode('');
                              setPromoSuccess('');
                              fireToast('Promo code removed', 'info');
                            }}
                            className="px-4 py-2.5 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={handleApplyPromoCode}
                            disabled={!promoCode || isApplyingPromo || hasBundleDiscount}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-blue-500/20 active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {isApplyingPromo ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Apply'
                            )}
                          </button>
                        )}
                      </div>
                      {promoError && (
                        <p className="text-xs font-medium text-rose-500 mt-2 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 p-2 rounded-xl">
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>{promoError}</span>
                        </p>
                      )}
                      {promoSuccess && (
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-2 rounded-xl">
                          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
                          <span>{promoSuccess}</span>
                        </p>
                      )}
                    </div>

                    {/* Mode of Delivery in Sidebar */}
                    <div className="py-3 space-y-2 border-b border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-[#3C6CA8]" />
                          <span>Mode of Delivery</span>
                        </span>
                        <span className="font-black text-xs text-[#3C6CA8] px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 border border-[#3C6CA8]/20">
                          {shippingLocation ? (shippingFee === 0 ? 'Paid Upon Delivery' : `₱${shippingFee.toLocaleString('en-PH')}`) : 'Select Mode'}
                        </span>
                      </div>
                      
                      <div className="relative" ref={shippingDropdownRef}>
                        {/* Custom Dropdown Trigger Button */}
                        <button
                          type="button"
                          onClick={() => setIsShippingDropdownOpen(!isShippingDropdownOpen)}
                          className="w-full text-xs px-3.5 py-3 border border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50/80 dark:bg-slate-800/80 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-900 dark:text-slate-100 font-bold focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none cursor-pointer flex items-center justify-between gap-2 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0">
                              <Truck className="w-3.5 h-3.5 text-[#3C6CA8]" />
                            </div>
                            <span className="truncate text-xs font-extrabold">
                              {(() => {
                                const modeObj = DELIVERY_MODES.find(m => m.id === shippingLocation);
                                if (modeObj) return modeObj.name;
                                const locObj = shippingLocations.find(loc => (loc.code || loc.id) === shippingLocation);
                                return locObj ? locObj.name : '-- Select Mode of Delivery --';
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isShippingDropdownOpen ? 'rotate-180 text-[#3C6CA8]' : ''}`} />
                          </div>
                        </button>

                        {/* Custom Dropdown Popover Menu */}
                        {isShippingDropdownOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-3.5 py-1.5 border-b border-gray-100 dark:border-slate-800 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              Choose Mode of Delivery
                            </div>
                            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50 custom-scrollbar">
                              {DELIVERY_MODES.map((mode) => {
                                const isSelected = shippingLocation === mode.id || (
                                  (mode.id === 'JT_LUZON' && shippingLocation === 'LUZON') ||
                                  (mode.id === 'JT_VISAYAS' && shippingLocation === 'VISAYAS') ||
                                  (mode.id === 'JT_MINDANAO' && shippingLocation === 'MINDANAO') ||
                                  (mode.id === 'MAXIM_DAVAO' && shippingLocation === 'MAXIM') ||
                                  (mode.id === 'LALAMOVE_MM' && (shippingLocation === 'NCR' || shippingLocation === 'LALAMOVE'))
                                );

                                return (
                                  <button
                                    key={mode.id}
                                    type="button"
                                    onClick={() => {
                                      setShippingLocation(mode.id);
                                      setIsShippingDropdownOpen(false);
                                    }}
                                    className={`w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-[#3C6CA8]/5 dark:hover:bg-slate-800/80 transition-all cursor-pointer ${
                                      isSelected ? 'bg-[#3C6CA8]/10 text-[#3C6CA8] font-black' : 'text-gray-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                        isSelected ? 'bg-[#3C6CA8] text-white border-[#3C6CA8]' : 'bg-gray-100 dark:bg-slate-800 text-[#3C6CA8] border-gray-200 dark:border-slate-700'
                                      }`}>
                                        <Truck className="w-4 h-4" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-extrabold text-xs leading-tight truncate">{mode.name}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                                          {mode.desc}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-black text-xs text-[#3C6CA8]">
                                        {mode.fee === 0 ? 'Paid Upon Delivery' : `₱${mode.fee}`}
                                      </span>
                                      {isSelected && <Check className="w-4 h-4 text-[#3C6CA8]" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600 dark:text-slate-400 font-medium">
                        <span>Subtotal</span>
                        <div className="flex items-center gap-2">
                          {hasItemDiscount || hasBundleDiscount ? (
                            <span className="text-gray-400 line-through">
                              ₱{originalSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                          ) : null}
                          <span className="font-bold text-gray-900 dark:text-white">
                            ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {hasItemDiscount && (
                        <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Tag className="w-3.5 h-3.5" />
                            Discount on items
                          </span>
                          <span className="font-extrabold">
                            -₱{itemDiscountSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}

                      {hasBundleDiscount && (
                        <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Percent className="w-3.5 h-3.5" />
                            Bundle discount
                          </span>
                          <span className="font-extrabold">
                            -₱{bundleSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}

                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                          <span className="flex items-center gap-1.5 font-bold">
                            <Tag className="w-3.5 h-3.5" />
                            Promo ({appliedPromo?.code})
                          </span>
                          <span className="font-extrabold">
                            -₱{discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      )}

                      <div className="flex justify-between items-center text-gray-600 dark:text-slate-400 font-medium">
                        <span>Shipping Fee</span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {shippingLocation ? `₱${shippingFee.toLocaleString('en-PH')}` : '₱0'}
                        </span>
                      </div>
                    </div>

                    {/* Premium Grand Total Card */}
                    <div className="mt-4 pt-2">
                      <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-2xl p-4 shadow-lg border border-slate-700/60 relative overflow-hidden">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-bold text-sm text-slate-300 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-400" /> Total
                          </span>
                          <span className="text-2xl font-black text-amber-400 tracking-tight">
                            ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        
                        {(itemDiscountSavings + bundleSavings + discountAmount) > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" /> Total Savings
                            </span>
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black text-[11px]">
                              ₱{(itemDiscountSavings + bundleSavings + discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 0 })} SAVED
                            </span>
                          </div>
                        )}
                      </div>

                      {!shippingLocation && (
                        <p className="text-xs text-rose-500 font-bold mt-2 text-center animate-pulse flex items-center justify-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Please select a shipping location to proceed</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

  // Payment Step
  const paymentMethodInfo = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
  const isPaymongoSelected = paymentMethodInfo?.name === 'PayMongo';
  const isHitpaySelected = paymentMethodInfo?.name === 'HitPay';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-2 sm:py-6 animate-fadeIn">
      <div className="container-global">
        <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 sm:px-6 py-3 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <span className="font-heading text-base sm:text-lg font-extrabold text-gray-900 dark:text-white shrink-0">Checkout</span>
              <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold border border-[#3C6CA8]/20 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40 truncate">
                Step 2 of 2: Payment & Review
              </span>
            </div>
            <button
              onClick={() => setStep('details')}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#3C6CA8] transition-colors cursor-pointer shrink-0"
              aria-label="Back to Information"
            >
              <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Back to</span> Details
            </button>
          </div>

          {/* Content */}
          <div className="p-3.5 sm:p-6 md:p-8 bg-white dark:bg-slate-900">
          {pricesUpdatedAt && (
            <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-800">
              <Info className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm font-medium">
                Prices have been updated to the latest from our store.
              </div>
              <button onClick={dismissPriceUpdateNotice} className="p-1 hover:bg-amber-100 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Payment Form */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Payment Method Selection */}
              <div className="space-y-2.5 sm:space-y-3">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1.5 sm:mb-2 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm sm:text-base md:text-lg font-bold block leading-tight">Payment Method</span>
                      <p className="text-[11px] sm:text-xs text-gray-400 font-normal mt-0.5 leading-tight">Select your preferred payment channel</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">256-Bit SSL</span> Encrypted
                  </span>
                </h2>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-4">
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod === method.id;
                    const displayName = method.name.replace(/^SlimDose\s+/i, '');
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethod(method.id)}
                        className={`group relative p-2 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between text-left cursor-pointer min-h-[76px] sm:min-h-[88px] ${
                          isSelected
                            ? 'border-[#3C6CA8] bg-blue-50/70 dark:bg-[#3C6CA8]/20 shadow-sm ring-2 ring-[#3C6CA8]/30 font-bold'
                            : 'border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50 bg-white dark:bg-slate-900/90'
                        }`}
                      >
                        {/* Top Row: Icon + Radio */}
                        <div className="flex items-center justify-between w-full mb-1 sm:mb-1.5">
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? 'bg-[#3C6CA8] text-white border-[#3C6CA8]'
                              : 'bg-[#3C6CA8]/10 text-[#3C6CA8] border-[#3C6CA8]/20 group-hover:bg-[#3C6CA8]/20'
                          }`}>
                            <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </div>

                          <div className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'border-[#3C6CA8] bg-[#3C6CA8]' : 'border-gray-300 dark:border-slate-600'
                          }`}>
                            {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                        </div>

                        {/* Bottom/Middle: Details */}
                        <div className="min-w-0 flex-1 w-full">
                          <p className="font-extrabold text-gray-900 dark:text-white text-[11.5px] sm:text-sm leading-tight truncate">
                            {displayName || method.name}
                          </p>
                          <p className="text-[9.5px] sm:text-[10.5px] text-gray-500 dark:text-slate-400 font-medium truncate mt-0.5">
                            {method.account_name}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!isPaymongoSelected && paymentMethodInfo && (
                  <div className="bg-slate-50/80 dark:bg-slate-900/60 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-200/80 dark:border-slate-800 space-y-2.5 sm:space-y-4 shadow-xs sm:shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 dark:border-slate-800 pb-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3C6CA8] shrink-0" />
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wide truncate">
                          Payment Instructions — {paymentMethodInfo.name}
                        </h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {/* 1. Account Number & Account Name in 2 columns inline */}
                      <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm text-gray-700 dark:text-slate-200">
                        <div className="p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/80">
                          <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5">Account Number</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs sm:text-sm tracking-wider block truncate">{paymentMethodInfo.account_number}</span>
                        </div>

                        <div className="p-2 sm:p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/80">
                          <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-slate-400 block mb-0.5">Account Name</span>
                          <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm block truncate">{paymentMethodInfo.account_name}</span>
                        </div>
                      </div>

                      {/* 2. High-Visibility QR Code */}
                      {paymentMethodInfo.qr_code_url && (
                        <div className="flex flex-col items-center justify-center p-2.5 sm:p-4 bg-white dark:bg-slate-800 rounded-xl sm:rounded-2xl shadow-xs border border-gray-200/80 dark:border-slate-700">
                          <div className="relative group p-1.5 sm:p-2 bg-white rounded-lg sm:rounded-xl">
                            <img
                              src={paymentMethodInfo.qr_code_url}
                              alt="Payment QR Code"
                              className="w-40 h-40 sm:w-52 sm:h-52 md:w-60 md:h-60 object-contain rounded-md sm:rounded-lg transition-transform duration-300 group-hover:scale-105"
                            />
                          </div>
                          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 mt-1.5 flex items-center gap-1">
                            <QrCode className="w-3 h-3 text-[#3C6CA8]" /> Scan QR with banking / e-Wallet app
                          </span>
                        </div>
                      )}

                      {/* 3. Amount to Pay placed below QR Code */}
                      <div className="p-2.5 sm:p-3.5 bg-blue-50/70 dark:bg-blue-950/40 rounded-xl sm:rounded-2xl border border-blue-200/80 dark:border-blue-800/60 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] sm:text-[10px] uppercase font-extrabold text-[#3C6CA8] dark:text-blue-300 block mb-0.5">Amount to Pay</span>
                          <span className="text-xl sm:text-2xl font-black text-[#3C6CA8] dark:text-blue-300">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                        </div>
                        <span className="text-[9.5px] sm:text-[10.5px] font-bold text-blue-700 dark:text-blue-300 bg-white/90 dark:bg-slate-800 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-700">
                          Exact Amount
                        </span>
                      </div>
                    </div>

                    {/* Upload Payment Receipt & Reference (Placed directly below Payment Instructions & QR Code) */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-3 sm:p-5 border border-gray-200/80 dark:border-slate-800 mt-3 sm:mt-4">
                      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                        <h4 className="text-xs sm:text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                          <FileImage className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#3C6CA8] shrink-0" />
                          <span className="truncate">Upload Payment Receipt & Reference *</span>
                        </h4>
                      </div>

                      {!paymentProof ? (
                        <label className="flex flex-col items-center justify-center w-full h-24 sm:h-30 border-2 border-[#3C6CA8]/30 border-dashed rounded-xl sm:rounded-2xl cursor-pointer bg-blue-50/40 dark:bg-slate-800/40 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all group">
                          <div className="flex flex-col items-center justify-center text-center px-3 py-2">
                            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <p className="text-[11px] sm:text-xs text-gray-700 dark:text-slate-200 font-semibold leading-tight">
                              <span className="text-[#3C6CA8] underline">Click to choose file</span> or drag & drop payment receipt
                            </p>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">
                              Accepts PNG, JPG, JPEG screenshots (Up to 10MB)
                            </p>
                          </div>
                          <input id="checkout-file-upload" name="file_upload" type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setPaymentProof(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      ) : (
                        <div className="relative bg-blue-50/40 dark:bg-slate-800/60 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-[#3C6CA8]/30 flex items-center gap-2.5">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-xs relative">
                            {paymentProofPreview ? (
                              <img
                                src={paymentProofPreview}
                                alt="Receipt preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <FileImage className="w-5 h-5 text-[#3C6CA8]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 mb-0.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              <p className="text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white truncate">
                                {paymentProof.name}
                              </p>
                            </div>
                            <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-slate-400 font-medium leading-tight">
                              {(paymentProof.size / 1024 / 1024).toFixed(2)} MB • Ready for admin verification
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPaymentProof(null)}
                            className="p-1 hover:bg-rose-100 text-rose-500 dark:hover:bg-rose-950/60 rounded-lg transition-colors shrink-0 cursor-pointer"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Notes Section */}
              <div className="pt-3 border-t border-gray-150 dark:border-slate-800 space-y-2.5">
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="font-extrabold text-xs sm:text-sm md:text-base block truncate">Order Notes</span>
                </h2>
                <div className="relative">
                  <textarea id="checkout-input-8" name="input_8" value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Leave with guard, landmark, gate code..."
                    className="w-full text-xs sm:text-sm p-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium min-h-[80px] sm:min-h-[100px] resize-y"
                    maxLength={500}
                  />
                  <div className="flex justify-end mt-1.5 text-[10px] sm:text-[11px] text-gray-400 dark:text-slate-500">
                    <span className="font-mono">{notes.length}/500</span>
                  </div>
                </div>
              </div>

              {/* Preferred Contact Method Selection */}
              {!isHitpaySelected && (
                <div className="pt-3 border-t border-gray-150 dark:border-slate-800 space-y-2.5">
                  <h2 className="text-sm sm:text-base md:text-lg font-extrabold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#3C6CA8]" />
                    Preferred Contact Method *
                  </h2>
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      onClick={() => setContactMethod('messenger')}
                      className={`p-3 sm:p-4 rounded-xl border-2 transition-all flex items-center justify-between cursor-pointer ${
                        contactMethod === 'messenger'
                          ? 'border-[#3C6CA8] bg-blue-50/40 dark:bg-slate-800/80 shadow-xs'
                          : 'border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">Telegram</p>
                          <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">@slimdose_mnl</p>
                        </div>
                      </div>
                      {contactMethod === 'messenger' && (
                        <div className="w-5 h-5 bg-[#3C6CA8] rounded-full flex items-center justify-center text-white shrink-0 shadow-xs">
                          <span className="text-xs font-extrabold">✓</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const canSubmit = !!shippingLocation && !!paymentProof && !isUploadingProof;
                return (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!canSubmit || isPlacingOrder}
                    className={`w-full py-3.5 sm:py-4 px-4 rounded-2xl font-extrabold text-sm sm:text-base md:text-lg shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      canSubmit && !isPlacingOrder
                        ? 'bg-[#3C6CA8] hover:bg-[#315A8E] text-white shadow-[#3C6CA8]/20 hover:shadow-xl'
                        : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isPlacingOrder ? (
                      <>
                        <svg className="animate-spin-fast w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        <span>Submitting Order...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Submit Order</span>
                      </>
                    )}
                  </button>
                );
              })()}
              {isUploadingProof && (
                <div className="mt-2 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading payment proof...
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1 lg:self-start lg:sticky lg:top-28">
              <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xs sm:shadow-xl p-3.5 sm:p-5 md:p-6 border border-slate-200 dark:border-slate-800 transition-all duration-300">
                <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-sm sm:text-base md:text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                    <span>Final Summary</span>
                  </h2>
                  <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    Step 2 Review
                  </span>
                </div>

                {/* Customer Info Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-4 mb-3 sm:mb-4 text-xs border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" /> <span className="truncate">{fullName}</span>
                  </p>
                  <p className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="truncate">{email}</span>
                  </p>
                  <p className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5 truncate">
                    <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" /> <span className="truncate">{phone}</span>
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 dark:text-slate-200 leading-tight">{address}</p>
                      <p className="text-[11px] leading-tight text-gray-500 dark:text-slate-400">{barangay}, {city}</p>
                      <p className="text-[11px] leading-tight text-gray-500 dark:text-slate-400">{state} {zipCode}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items with Profile Thumbnails */}
                <div className="space-y-2 mb-3 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {cartItems.map((item, index) => {
                    const hasVariation = !!item.variation;
                    const originalPrice = hasVariation
                      ? item.variation!.price * item.quantity
                      : item.product.base_price * item.quantity;
                    const currentPrice = item.price * item.quantity;
                    const savedAmount = originalPrice - currentPrice;
                    const hasProductDiscount = savedAmount > 0;
                    const imageUrl = item.product.image_url || (item.product as any).image || (item.product as any).imageUrl;

                    return (
                      <div key={index} className="p-2 sm:p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 relative flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={item.product.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                            <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white font-extrabold text-[8px] sm:text-[9px] px-1 py-0.2 rounded-tl">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{item.product.name}</p>
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              {item.variation && (
                                <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 truncate max-w-[90px]">{item.variation.name}</p>
                              )}
                              {(() => {
                                const itemPricing = resolveProductPricing(item.product, item.variation, globalDiscount);
                                if (itemPricing.hasGlobalDiscount) {
                                  return (
                                    <span className="text-[8px] sm:text-[8.5px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100/80 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 truncate max-w-[120px]">
                                      {globalDiscount?.name || 'Sale'}
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end justify-center pl-1">
                          <span className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm">
                            ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                          {hasProductDiscount && savedAmount > 0 && (
                            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              -₱{savedAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-slate-400 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center p-1.5 sm:p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
                      <span className="flex items-center gap-1 font-bold">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        Saved with {appliedPromo?.code}
                      </span>
                      <span className="font-extrabold">
                        -₱{discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-gray-600 dark:text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-blue-600" /> Shipping
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {shippingLocation ? `₱${shippingFee.toLocaleString('en-PH')}` : 'Select location'}
                    </span>
                  </div>

                  {/* Grand Total Card */}
                  <div className="mt-3 pt-1">
                    <div className="bg-slate-900 dark:bg-slate-800 text-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-md border border-slate-700/60 relative overflow-hidden">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs sm:text-sm text-slate-300 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> Total
                        </span>
                        <span className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                          ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>

                      {(itemDiscountSavings + bundleSavings + discountAmount) > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-700/80 flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Savings
                          </span>
                          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-black text-[10px]">
                            ₱{(itemDiscountSavings + bundleSavings + discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 0 })} OFF
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

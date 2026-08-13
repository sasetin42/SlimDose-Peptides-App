import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Package, CreditCard, Sparkles, Heart, Copy, Check, MessageCircle, Tag, XCircle, CheckCircle, CheckCircle2, Upload, X, FileImage, Loader2, Info, Wallet, User, Mail, Phone, MapPin, Building2, Navigation, Globe, FileText, Truck, Percent, ShoppingBag, ChevronDown, Search, Lock, MessageSquare } from 'lucide-react';
import { PH_PROVINCES, searchProvinces, getCitiesForProvince, getBarangaysForCity } from '../lib/philippineLocations';

const HITPAY_METHOD_ID = 'hitpay';
import type { CartItem } from '../types';
import { usePaymentMethods } from '../hooks/usePaymentMethods';
import { useShippingLocations } from '../hooks/useShippingLocations';
import { supabase } from '../lib/supabase';
import { useImageUpload } from '../hooks/useImageUpload';
import { mirrorOrderCreate, mirrorPromoIncrementUsage } from '../lib/convexMirror';
import { useBundleTiers } from '../hooks/useBundleTiers';
import { useGlobalDiscount } from '../hooks/useGlobalDiscount';
import { computeCartPricing } from '../utils/pricing';
import { trackOrderStatus, identifyUser } from '../utils/analytics';
import { fireToast } from './ToastNotification';

interface CheckoutProps {
  cartItems: CartItem[];
  totalPrice: number;
  refreshCartPrices: () => Promise<boolean>;
  pricesUpdatedAt: number | null;
  dismissPriceUpdateNotice: () => void;
  onBack: () => void;
  /** Called after a successful manual-payment order — clears cart and navigates home */
  onOrderSuccess?: () => void;
}

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

  // Autofill from saved cookie on mount
  useEffect(() => {
    try {
      const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('slimdose_checkout='));
      if (!match) return;
      const raw = decodeURIComponent(match.split('=').slice(1).join('='));
      const saved = JSON.parse(raw);
      if (saved.fullName) setFullName(saved.fullName);
      if (saved.email) setEmail(saved.email);
      if (saved.phone) setPhone(saved.phone);
      if (saved.address) setAddress(saved.address);
      if (saved.barangay) setBarangay(saved.barangay);
      if (saved.city) setCity(saved.city);
      if (saved.state) setState(saved.state);
      if (saved.zipCode) setZipCode(saved.zipCode);
      if (saved.shippingLocation) setShippingLocation(saved.shippingLocation);
    } catch (err) {
      console.warn('Failed to read saved checkout cookie:', err);
    }
  }, []);
  const { paymentMethods } = usePaymentMethods();
  const { locations: shippingLocations, getShippingFee } = useShippingLocations();
  const [step, setStep] = useState<'details' | 'payment' | 'confirmation'>('details');

  const [customer, setCustomer] = useState<any>(() => {
    const saved = localStorage.getItem('slimdose_customer');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('slimdose_customer');
      const parsed = saved ? JSON.parse(saved) : null;
      setCustomer(parsed);
      if (parsed) {
        setFullName(parsed.full_name || parsed.name || '');
        setEmail(parsed.email || '');
        setPhone(parsed.phone || '');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customer_auth_success', ((e: CustomEvent) => {
      localStorage.setItem('slimdose_customer', JSON.stringify(e.detail));
      setCustomer(e.detail);
      setFullName(e.detail.full_name || e.detail.name || '');
      setEmail(e.detail.email || '');
      setPhone(e.detail.phone || '');
    }) as EventListener);
    handleStorageChange();
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customer_auth_success', handleStorageChange as EventListener);
    };
  }, []);

  // Customer Details
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Shipping Details
  const [address, setAddress] = useState('');
  const [barangay, setBarangay] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [shippingLocation, setShippingLocation] = useState<'LUZON' | 'VISAYAS' | 'MINDANAO' | 'MAXIM' | ''>('');

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
  const { uploadImage, uploading: isUploadingProof } = useImageUpload('payment-proofs'); // Use the new bucket

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
  const cityDropdownRef = React.useRef<HTMLDivElement>(null);

  const [isBarangayOpen, setIsBarangayOpen] = useState(false);
  const [barangaySearch, setBarangaySearch] = useState('');
  const barangayDropdownRef = React.useRef<HTMLDivElement>(null);

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
    if (!selectedPaymentMethod) {
      setSelectedPaymentMethod(HITPAY_METHOD_ID);
    }
  }, [selectedPaymentMethod]);

  // Calculate shipping fee based on location (uses dynamic fees from database)
  const shippingFee = shippingLocation ? getShippingFee(shippingLocation) : 0;

  const isHitpaySelected = selectedPaymentMethod === HITPAY_METHOD_ID;
  const hitpayFee = isHitpaySelected ? Math.round((totalPrice + shippingFee - discountAmount) * 0.03) : 0;

  // Calculate final total (Subtotal + Shipping - Discount + HitPay fee)
  const finalTotal = Math.max(0, totalPrice + shippingFee - discountAmount + hitpayFee);

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
    if (isDetailsValid) {
      setStep('payment');
    }
  };

  const [isCreatingHitpayCheckout, setIsCreatingHitpayCheckout] = useState(false);

  const handlePlaceOrder = async () => {
    if (!shippingLocation) {
      fireToast('Please select your shipping location.', 'warning');
      return;
    }

    if (!isHitpaySelected && !contactMethod) {
      fireToast('Please select your preferred contact method (Telegram).', 'warning');
      return;
    }

    if (!isHitpaySelected && !paymentProof) {
      fireToast('Please upload a screenshot of your payment proof to proceed.', 'warning');
      return;
    }

    setIsPlacingOrder(true);

    const paymentMethod = paymentMethods.find(pm => pm.id === selectedPaymentMethod);

    try {
      // 1. Upload Payment Proof First (manual methods only)
      let paymentProofUrl = null;
      if (!isHitpaySelected && paymentProof) {
        try {
          paymentProofUrl = await uploadImage(paymentProof);
        } catch (uploadError: any) {
          console.error('Failed to upload payment proof:', uploadError);
          fireToast(`Failed to upload payment proof: ${uploadError.message}`, 'error');
          setIsPlacingOrder(false);
          return;
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

      // Save order to database
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([{
          customer_name: fullName,
          customer_email: email,
          customer_phone: phone,
          shipping_address: address,
          shipping_barangay: barangay,
          shipping_city: city,
          shipping_state: state,
          shipping_zip_code: zipCode,
          order_items: orderItems,
          total_price: Math.max(0, totalPrice - discountAmount) + (isHitpaySelected ? hitpayFee : 0), // Store subtotal minus discount + HitPay fee
          shipping_fee: shippingFee,
          shipping_location: shippingLocation,
          payment_method_id: isHitpaySelected ? 'hitpay' : (paymentMethod?.id || null),
          payment_method_name: isHitpaySelected ? 'HitPay' : (paymentMethod?.name || null),
          payment_proof_url: paymentProofUrl,
          contact_method: isHitpaySelected ? 'hitpay' : (contactMethod || null),
          notes: notes.trim() || null,
          order_status: 'new',
          payment_status: 'pending',
          promo_code_id: appliedPromo?.id || null,
          promo_code: appliedPromo?.code || null,
          discount_applied: discountAmount + bundleSavings,
          hitpay_fee: isHitpaySelected ? hitpayFee : 0
        }])
        .select()
        .single();

      if (orderError || !orderData) {
        console.error('❌ Error saving order to Supabase:', orderError);
        fireToast('Failed to save order. Please contact support.', 'error');
        setIsPlacingOrder(false);
        return;
      }

      setPlacedOrder(orderData);

      // Mirror order to Convex (fire-and-forget)
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

      // Update promo code usage count
      if (appliedPromo) {
        const { error: promoUpdateError } = await supabase
          .from('promo_codes')
          .update({ usage_count: appliedPromo.usage_count + 1 })
          .eq('id', appliedPromo.id);

        if (promoUpdateError) {
          console.error('Failed to update promo usage count:', promoUpdateError);
        } else {
          mirrorPromoIncrementUsage(appliedPromo.id);
        }
      }

      console.log('✅ Order saved to database:', orderData);

      // Save customer/shipping info to cookie for autofill on next checkout (1 year)
      try {
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
      } catch (err) {
        console.warn('Failed to save checkout cookie:', err);
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        identifyUser(normalizedEmail, { name: fullName || null });
        const itemsSummary = orderItems
          .map((i) => {
            const name = i.variation_name ? `${i.product_name} — ${i.variation_name}` : i.product_name;
            return `${i.quantity} × ${name} — ₱${(i.total).toLocaleString()}`;
          })
          .join('\n');
        trackOrderStatus('new', {
          order_id: orderData.id,
          order_number: orderData.order_number ?? null,
          items_summary: itemsSummary,
          subtotal: totalPrice.toLocaleString(),
          shipping_fee: shippingFee.toLocaleString(),
          discount: discountAmount.toLocaleString(),
          promo_code: appliedPromo?.code || promoCode || '',
          total_price: finalTotal.toLocaleString(),
          payment_method: isHitpaySelected ? 'HitPay' : (paymentMethod?.name || '—'),
          contact_method: contactMethod ? (contactMethod.charAt(0).toUpperCase() + contactMethod.slice(1)) : '—',
          item_count: orderItems.reduce((n, i) => n + i.quantity, 0),
          email: normalizedEmail,
        });
      } else {
        console.warn('Skipping order tracking: invalid email', email);
      }

      // HitPay path: create checkout session and redirect to hosted page.
      if (isHitpaySelected) {
        try {
          setIsCreatingHitpayCheckout(true);
          const origin = window.location.origin;
          const successUrl = `${origin}/?hitpay=success&order_id=${orderData.id}`;
          const cancelUrl = `${origin}/?hitpay=cancel&order_id=${orderData.id}`;
          const { data: hpRes, error: hpErr } = await supabase.functions.invoke(
            'hitpay-create-checkout',
            { body: { order_id: orderData.id, success_url: successUrl, cancel_url: cancelUrl } }
          );
          if (hpErr) {
            console.error('HitPay invoke error:', hpErr);
            alert(`Failed to start HitPay checkout: ${(hpErr as any)?.message || 'transport error'}`);
            setIsCreatingHitpayCheckout(false);
            return;
          }
          if (!hpRes?.ok || !hpRes?.checkout_url) {
            console.error('HitPay function returned error:', hpRes);
            alert(`Failed to start HitPay checkout: ${hpRes?.error || 'Unknown error'}`);
            setIsCreatingHitpayCheckout(false);
            return;
          }
          window.location.href = hpRes.checkout_url;
          return;
        } catch (e: any) {
          console.error('HitPay redirect failed:', e);
          alert(`Failed to start HitPay checkout: ${e?.message || 'Unknown error'}`);
          setIsCreatingHitpayCheckout(false);
          return;
        }
      }

      // Fire-and-forget Telegram notification to admin group
      supabase.functions
        .invoke('telegram-notify-order', { body: { order_id: orderData.id } })
        .catch((err) => console.error('Telegram notify failed:', err));

      // Get current date and time
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
Telegram: https://t.me/slimdosedvo

📋 ORDER ID: ${orderData.order_number || orderData.id}

Please confirm this order. Thank you!
      `.trim();

      // Store order message for copying
      setOrderMessage(orderDetails);

      // Auto-copy to clipboard
      try {
        await navigator.clipboard.writeText(orderDetails);
        setCopied(true);
      } catch (err) {
        console.error('Failed to auto-copy:', err);
      }

      // Open contact method based on selection
      // Using m.me link with Page ID to open Messenger directly
      const contactUrl = contactMethod === 'messenger'
        ? `https://t.me/slimdosedvo`
        : null;

      if (contactUrl) {
        // Short delay to ensure clipboard write finishes and UI updates
        setTimeout(() => {
          try {
            const contactWindow = window.open(contactUrl, '_blank');
            if (!contactWindow || contactWindow.closed || typeof contactWindow.closed === 'undefined') {
              console.warn('⚠️ Popup blocked or contact method failed to open');
              setContactOpened(false);
            } else {
              setContactOpened(true);
            }
          } catch (error) {
            console.error('❌ Error opening contact method:', error);
            setContactOpened(false);
          }
        }, 500);
      }

      // Generate reference number
      const ref = orderData?.order_number || `ORD-${new Date().getFullYear()}-${(orderData?.id || Date.now().toString()).toString().slice(0, 8).toUpperCase()}`;
      setOrderRef(ref);

      fireToast('Order placed successfully! 🎉', 'success', 6000);

      // Show confirmation
      setStep('confirmation');
      onOrderSuccess?.();
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
      ? `https://t.me/slimdosedvo`
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800">
          {/* Dedicated Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg font-bold text-gray-900 dark:text-white">Order Confirmed</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
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
          <div className="p-5 md:p-8 bg-gradient-to-br from-white via-gray-50 to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 text-center">
            {/* Animated success icon */}
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="w-28 h-28 rounded-full flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg, #3C6CA8, #264874)' }}>
                <svg viewBox="0 0 52 52" className="w-14 h-14" fill="none">
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
                  className="animate-confetti absolute w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: c,
                    top: `${[10,5,15,0,8][i]}%`,
                    left: `${[10,50,80,30,65][i]}%`,
                    animationDelay: `${i * 0.12}s`,
                  }}
                />
              ))}
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center justify-center gap-2 flex-wrap">
              <span style={{ color: '#3C6CA8' }}>Order Placed!</span>
              <Sparkles className="w-7 h-7" style={{ color: '#3C6CA8' }} />
            </h1>

            {/* Reference number */}
            {orderRef && (
              <div className="inline-flex items-center gap-2 bg-navy-50 border border-navy-200 rounded-full px-4 py-1.5 mb-4">
                <span className="text-xs font-semibold text-navy-600 uppercase tracking-wider">Ref:</span>
                <span className="font-mono text-sm font-bold" style={{ color: '#3C6CA8' }}>{orderRef}</span>
              </div>
            )}

            <p className="text-gray-600 mb-6 text-base md:text-lg leading-relaxed">
              Copy the order message below and send it via Telegram along with your payment screenshot.
            </p>

            {isManualPayment && (
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-gray-200 dark:border-slate-800/80 rounded-2xl p-5 mb-6 text-left space-y-4">
                <h3 className="font-bold text-navy-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <FileImage className="w-5 h-5 text-blue-600" />
                  Upload Proof of Payment (Receipt)
                </h3>
                
                {invoiceUploaded ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 p-4 rounded-xl text-center space-y-2 animate-fadeIn">
                    <p className="text-emerald-800 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      Receipt Submitted Successfully
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold leading-relaxed">
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
                      <input 
                        type="file" 
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-3 sm:px-6 lg:px-8 animate-fadeIn">
        <div className="max-w-7xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-3xl border border-gray-200 dark:border-slate-800">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20 rounded-t-3xl">
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
          <div className="p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-900 rounded-b-3xl">
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
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 md:p-6 border border-gray-200 dark:border-slate-800">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <User className="w-5 h-5" />
                    </div>
                    <span>Customer Information</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#3C6CA8]" /> Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full text-sm pl-10 pr-3 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="Dr. Juan Dela Cruz"
                          required
                        />
                        <User className="w-4 h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-[#3C6CA8]" /> Email Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full text-sm pl-10 pr-3 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="sarah.jenkins@biotech-research.org"
                          required
                        />
                        <Mail className="w-4 h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-[#3C6CA8]" /> Phone Number <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full text-sm pl-10 pr-3 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="0917-555-8899"
                          required
                        />
                        <Phone className="w-4 h-4 text-[#3C6CA8] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm p-5 md:p-6 border border-gray-200 dark:border-slate-800 relative z-20">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <span>Shipping Address</span>
                  </h2>
                  <div className="space-y-4">
                    {/* 1. Street Address */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" /> Street Address <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full text-sm pl-10 pr-3 py-3 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium"
                          placeholder="123 Rizal Street, House/Apt #"
                          required
                        />
                        <MapPin className="w-4 h-4 text-rose-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* 2. Province & City (Inline Row with Interchanged Order & Connected Real-Time Selection) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* PROVINCE SELECTOR (Left) */}
                      <div className={`relative ${isProvinceOpen ? 'z-[100]' : 'z-20'}`} ref={provinceDropdownRef}>
                        <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-[#3C6CA8]" /> Province <span className="text-rose-500">*</span>
                          </span>
                          <span className="text-[10px] font-extrabold text-[#3C6CA8]">PH Locations</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProvinceOpen(!isProvinceOpen);
                            setIsCityOpen(false);
                            setIsBarangayOpen(false);
                          }}
                          className="w-full text-sm pl-10 pr-9 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none flex items-center justify-between transition-all cursor-pointer shadow-sm text-left"
                        >
                          <span className="truncate">{state || 'Select Province...'}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isProvinceOpen ? 'rotate-180 text-[#3C6CA8]' : ''}`} />
                        </button>
                        <Globe className="w-4 h-4 text-[#3C6CA8] absolute left-3 top-[39px] pointer-events-none" />

                        {/* Province Search Popover */}
                        {isProvinceOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Search Widget */}
                            <div className="px-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={provinceSearch}
                                  onChange={(e) => setProvinceSearch(e.target.value)}
                                  placeholder="Search province or region..."
                                  className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 text-gray-800 dark:text-slate-100"
                                  autoFocus
                                />
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
                                      setIsProvinceOpen(false);
                                      setProvinceSearch('');
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
                        <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Navigation className="w-3.5 h-3.5 text-emerald-500" /> City / Municipality <span className="text-rose-500">*</span>
                          </span>
                          {state && (
                            <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                              {getCitiesForProvince(state).length} Cities
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsCityOpen(!isCityOpen);
                            setIsProvinceOpen(false);
                            setIsBarangayOpen(false);
                          }}
                          className="w-full text-sm pl-10 pr-9 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none flex items-center justify-between transition-all cursor-pointer shadow-sm text-left"
                        >
                          <span className="truncate">{city || (state ? 'Select City/Municipality...' : 'Select Province First')}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCityOpen ? 'rotate-180 text-emerald-500' : ''}`} />
                        </button>
                        <Navigation className="w-4 h-4 text-emerald-500 absolute left-3 top-[39px] pointer-events-none" />

                        {/* City Search Popover */}
                        {isCityOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Search Widget */}
                            <div className="px-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={citySearch}
                                  onChange={(e) => setCitySearch(e.target.value)}
                                  placeholder={state ? `Search cities in ${state}...` : 'Search city or municipality...'}
                                  className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 text-gray-800 dark:text-slate-100"
                                  autoFocus
                                />
                              </div>
                            </div>
                            {/* City List */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
                              {getCitiesForProvince(state, citySearch).map((c) => {
                                const isSelected = city === c.name;
                                return (
                                  <button
                                    key={c.code}
                                    type="button"
                                    onClick={() => {
                                      setCity(c.name);
                                      setZipCode(c.zipCode || '');
                                      setBarangay('');
                                      setIsCityOpen(false);
                                      setCitySearch('');
                                    }}
                                    className={`w-full px-4 py-2.5 flex items-center justify-between text-left text-xs hover:bg-emerald-50 dark:hover:bg-slate-800/80 transition-all cursor-pointer ${
                                      isSelected ? 'bg-emerald-100/50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold' : 'text-gray-800 dark:text-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <Navigation className={`w-4 h-4 shrink-0 ${isSelected ? 'text-emerald-500' : 'text-gray-400'}`} />
                                      <div>
                                        <p className="font-bold text-sm">{c.name}</p>
                                        {c.zipCode && <p className="text-[11px] text-gray-400">ZIP: {c.zipCode}</p>}
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

                    {/* 3. Barangay & ZIP/Postal Code (Inline Row connected to City) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* BARANGAY SELECTOR (Left, Connected to City) */}
                      <div className={`relative ${isBarangayOpen ? 'z-[100]' : 'z-10'}`} ref={barangayDropdownRef}>
                        <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-teal-500" /> Barangay <span className="text-rose-500">*</span>
                          </span>
                          {city && (
                            <span className="text-[10px] font-extrabold text-teal-600 dark:text-teal-400">
                              {getBarangaysForCity(city).length} Barangays
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsBarangayOpen(!isBarangayOpen);
                            setIsProvinceOpen(false);
                            setIsCityOpen(false);
                          }}
                          className="w-full text-sm pl-10 pr-9 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none flex items-center justify-between transition-all cursor-pointer shadow-sm text-left"
                        >
                          <span className="truncate">{barangay || (city ? 'Select Barangay...' : 'Select City First')}</span>
                          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isBarangayOpen ? 'rotate-180 text-teal-500' : ''}`} />
                        </button>
                        <Building2 className="w-4 h-4 text-teal-500 absolute left-3 top-[39px] pointer-events-none" />

                        {/* Barangay Search Popover */}
                        {isBarangayOpen && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[9999] overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                            {/* Search Widget */}
                            <div className="px-3 pb-2 border-b border-gray-100 dark:border-slate-800">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                  type="text"
                                  value={barangaySearch}
                                  onChange={(e) => setBarangaySearch(e.target.value)}
                                  placeholder={city ? `Search barangay in ${city}...` : 'Search barangay...'}
                                  className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-[#3C6CA8]/30 text-gray-800 dark:text-slate-100"
                                  autoFocus
                                />
                              </div>
                            </div>
                            {/* Barangay List */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50">
                              {getBarangaysForCity(city || 'QC', barangaySearch).map((b) => {
                                const isSelected = barangay === b.name;
                                return (
                                  <button
                                    key={b.code}
                                    type="button"
                                    onClick={() => {
                                      setBarangay(b.name);
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
                      </div>

                      {/* ZIP / POSTAL CODE (Right - Automated & Disabled) */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-500" /> ZIP/Postal Code <span className="text-rose-500">*</span>
                          </span>
                          <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">Automated</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={zipCode}
                            readOnly
                            disabled
                            className="w-full text-sm pl-10 pr-3 py-3 border border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800/70 text-gray-500 dark:text-slate-400 font-bold cursor-not-allowed outline-none select-none opacity-90"
                            placeholder="Auto-filled based on City"
                          />
                          <FileText className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={!isDetailsValid}
                  className={`w-full py-3.5 sm:py-4 px-4 rounded-2xl font-extrabold text-sm sm:text-base md:text-lg transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                    isDetailsValid
                      ? 'bg-[#3C6CA8] hover:bg-[#325a8c] text-white shadow-[#3C6CA8]/25 border border-[#3C6CA8]/20'
                      : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <span>Proceed to Payment</span>
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
                </button>
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
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {item.variation && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40">
                                    {item.variation.name}
                                  </span>
                                )}
                                {item.product.purity_percentage && item.product.purity_percentage > 0 ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                                    {item.product.purity_percentage}% Purity
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-extrabold text-gray-900 dark:text-white text-sm">
                              ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                            {hasProductDiscount && savedAmount > 0 && (
                              <div className="flex flex-col items-end mt-0.5">
                                <span className="text-[10px] text-gray-400 line-through">
                                  ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
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
                        <input
                          type="text"
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

                    {/* Custom Animated Shipping Location Dropdown */}
                    <div className="py-3 space-y-2 border-b border-gray-100 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-[#3C6CA8]" />
                          <span>Shipping Location</span>
                        </label>
                        <span className="font-black text-xs text-[#3C6CA8] px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 border border-[#3C6CA8]/20">
                          {shippingLocation ? `₱${shippingFee.toLocaleString('en-PH')}` : 'Select Region'}
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
                              {(() => {
                                const code = shippingLocation.toUpperCase();
                                if (code.includes('MANILA') || code.includes('NCR')) return <Building2 className="w-3.5 h-3.5" />;
                                if (code.includes('LUZON')) return <MapPin className="w-3.5 h-3.5 text-emerald-500" />;
                                if (code.includes('VISAYAS')) return <Navigation className="w-3.5 h-3.5 text-purple-500" />;
                                if (code.includes('MINDANAO')) return <Globe className="w-3.5 h-3.5 text-amber-500" />;
                                if (code.includes('MAXIM') || code.includes('EXPRESS')) return <Truck className="w-3.5 h-3.5 text-rose-500" />;
                                return <Truck className="w-3.5 h-3.5 text-[#3C6CA8]" />;
                              })()}
                            </div>
                            <span className="truncate text-xs font-extrabold">
                              {(() => {
                                const selectedObj = shippingLocations.find(loc => (loc.code || loc.id) === shippingLocation);
                                return selectedObj ? selectedObj.name : '-- Select Shipping Region --';
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
                              Choose Region
                            </div>
                            <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/50 custom-scrollbar">
                              {shippingLocations.map((loc) => {
                                const code = loc.code || loc.id;
                                const isSelected = shippingLocation === code;

                                const isNcr = code.includes('MANILA') || code.includes('NCR');
                                const isLuzon = code.includes('LUZON');
                                const isVisayas = code.includes('VISAYAS');
                                const isMindanao = code.includes('MINDANAO');
                                const isMaxim = code.includes('MAXIM') || code.includes('EXPRESS');

                                let icon = <Truck className="w-4 h-4 text-[#3C6CA8]" />;
                                if (isNcr) icon = <Building2 className="w-4 h-4 text-blue-500" />;
                                else if (isLuzon) icon = <MapPin className="w-4 h-4 text-emerald-500" />;
                                else if (isVisayas) icon = <Navigation className="w-4 h-4 text-purple-500" />;
                                else if (isMindanao) icon = <Globe className="w-4 h-4 text-amber-500" />;
                                else if (isMaxim) icon = <Truck className="w-4 h-4 text-rose-500" />;

                                return (
                                  <button
                                    key={loc.id}
                                    type="button"
                                    onClick={() => {
                                      setShippingLocation(code as any);
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
                                        {icon}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-extrabold text-xs leading-tight truncate">{loc.name}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">
                                          {loc.delivery_days || 'Standard Delivery'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="font-black text-xs text-[#3C6CA8]">
                                        ₱{loc.fee}
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
    );
  }

  // Payment Step
  const paymentMethodInfo = paymentMethods.find(pm => pm.id === selectedPaymentMethod);
  const isPaymongoSelected = paymentMethodInfo?.name === 'PayMongo';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-6 px-3 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="container-global mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
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
        <div className="p-3 sm:p-6 md:p-8 bg-white dark:bg-slate-900">
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-4 sm:p-5 md:p-7 border border-gray-200 dark:border-slate-800">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 md:mb-6 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#3C6CA8]/10 text-[#3C6CA8] dark:text-blue-400 flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                      <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <span className="text-sm sm:text-base md:text-lg">Payment Method</span>
                      <p className="text-[11px] sm:text-xs text-gray-400 font-normal">Select your preferred payment channel</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 sm:py-1 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden xs:inline">256-Bit SSL</span> Encrypted
                  </span>
                </h2>

                <div className="grid grid-cols-1 gap-3 sm:gap-4 mb-6">
                  {/* HitPay option (cards / e-wallets) */}
                  <div
                    className={`rounded-2xl border-2 transition-all overflow-hidden ${isHitpaySelected
                      ? 'border-[#3C6CA8] bg-blue-50/20 dark:bg-slate-800/60 shadow-md ring-2 ring-[#3C6CA8]/20'
                      : 'border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50 bg-white dark:bg-slate-900'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod(HITPAY_METHOD_ID)}
                      className="w-full p-3.5 sm:p-4 md:p-5 flex flex-col justify-between gap-3 text-left cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isHitpaySelected ? 'border-[#3C6CA8] bg-[#3C6CA8]' : 'border-gray-300 dark:border-slate-600'}`}>
                          {isHitpaySelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <p className="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm md:text-base leading-tight">
                              Credit/Debit Cards & e-Wallets
                            </p>
                            <span className="bg-[#3C6CA8]/10 text-[#3C6CA8] dark:bg-[#3C6CA8]/20 dark:text-blue-300 font-bold text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full border border-[#3C6CA8]/20 shrink-0">
                              Instant Approval
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs text-gray-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-1 font-medium">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Lock className="w-3 h-3" /> HitPay Gateway
                            </span>
                            <span className="text-slate-600 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                              (3% fee)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap pt-1 border-t border-gray-100/60 dark:border-slate-800/60 sm:border-t-0 sm:pt-0">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-[9px] sm:text-[10px] font-extrabold flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" /> QRPH
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-[9px] sm:text-[10px] font-extrabold">
                          GCash
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-[9px] sm:text-[10px] font-extrabold">
                          Maya
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 text-[9px] sm:text-[10px] font-extrabold">
                          Billease
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[9px] sm:text-[10px] font-extrabold">
                          VISA/MC
                        </span>
                      </div>
                    </button>
                    {isHitpaySelected && (
                      <div className="bg-[#3C6CA8]/5 dark:bg-slate-800/80 px-5 py-3 border-t border-gray-100 dark:border-slate-800 text-xs md:text-sm text-gray-600 dark:text-slate-300 flex items-center justify-center gap-2 font-medium">
                        <Sparkles className="w-4 h-4 text-[#3C6CA8] shrink-0" />
                        <span>You will be redirected to HitPay's encrypted portal to complete your transaction safely.</span>
                      </div>
                    )}
                  </div>

                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`p-4 md:p-5 rounded-2xl border-2 transition-all flex items-center justify-between cursor-pointer ${selectedPaymentMethod === method.id
                        ? 'border-[#3C6CA8] bg-blue-50/20 dark:bg-slate-800/60 shadow-md ring-2 ring-[#3C6CA8]/20'
                        : 'border-gray-200 dark:border-slate-800 hover:border-[#3C6CA8]/50 bg-white dark:bg-slate-900'
                        }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedPaymentMethod === method.id ? 'border-[#3C6CA8] bg-[#3C6CA8]' : 'border-gray-300 dark:border-slate-600'}`}>
                          {selectedPaymentMethod === method.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <div className="w-10 h-10 bg-[#3C6CA8]/10 text-[#3C6CA8] rounded-xl flex items-center justify-center shrink-0 border border-[#3C6CA8]/20">
                          <Wallet className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                          <p className="font-extrabold text-gray-900 dark:text-white text-sm md:text-base">{method.name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Account: {method.account_name}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-[#3C6CA8] bg-[#3C6CA8]/10 px-2.5 py-1 rounded-full">
                        Manual Transfer
                      </span>
                    </button>
                  ))}
                </div>

                {!isPaymongoSelected && paymentMethodInfo && (
                  <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-5 md:p-6 border border-gray-200 dark:border-slate-700">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#3C6CA8]" /> Payment Details
                    </h3>
                    <div className="space-y-2 text-xs md:text-sm text-gray-700 dark:text-slate-200 mb-4 font-medium">
                      <p><strong>Account Number:</strong> {paymentMethodInfo.account_number}</p>
                      <p><strong>Account Name:</strong> {paymentMethodInfo.account_name}</p>
                      <p><strong>Amount to Pay:</strong> <span className="text-lg font-extrabold text-[#3C6CA8]">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span></p>
                    </div>

                    {paymentMethodInfo.qr_code_url && (
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                          <img
                            src={paymentMethodInfo.qr_code_url}
                            alt="Payment QR Code"
                            className="w-48 h-48 object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Order Notes Section */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-5 md:p-7 border border-gray-200 dark:border-slate-800">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <span>Order Notes</span>
                      <span className="text-xs font-normal text-gray-400 block">Optional delivery or handling instructions</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                    Delivery Instructions
                  </span>
                </h2>
                <div className="relative">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special instructions or notes for your order (e.g., Gate code, leave with guard, preferred delivery schedule)..."
                    className="w-full text-xs md:text-sm p-4 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-[#3C6CA8]/30 focus:border-[#3C6CA8] outline-none bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 transition-all font-medium min-h-[110px] resize-y"
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-gray-400 dark:text-slate-500">
                    <span className="flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-[#3C6CA8]" /> Notes are printed directly on your courier shipping label.
                    </span>
                    <span>{notes.length}/500</span>
                  </div>
                </div>
              </div>

              {/* Contact Method Selection (hidden for HitPay) */}
              {!isHitpaySelected && (
                <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                  <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 md:mb-6 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-gold-600" />
                    Preferred Contact Method *
                  </h2>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setContactMethod('messenger')}
                      className={`p-4 rounded-lg border-2 transition-all flex items-center justify-between ${contactMethod === 'messenger'
                        ? 'border-navy-900 bg-gold-50'
                        : 'border-gray-200 hover:border-navy-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <MessageCircle className="w-6 h-6 text-gold-600" />
                        <div className="text-left">
                          <p className="font-semibold text-navy-900">Telegram</p>
                          <p className="text-sm text-gray-500">@slimdosedvo</p>
                        </div>
                      </div>
                      {contactMethod === 'messenger' && (
                        <div className="w-6 h-6 bg-gold-600 rounded-full flex items-center justify-center">
                          <span className="text-black text-xs font-bold">✓</span>
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Proof Upload (hidden for HitPay) */}
              {!isHitpaySelected && (
                <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                  <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
                    <FileImage className="w-5 h-5 text-gold-600" />
                    Upload Payment Proof *
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Please upload a screenshot of your payment receipt (GCash, Bank Transfer, etc.).
                  </p>

                  {!paymentProof ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 text-blue-500 mb-2" />
                        <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> payment screenshot</p>
                        <p className="text-xs text-gray-400 mt-1">PNG, JPG or JPEG (MAX. 10MB)</p>
                      </div>
                      <input
                        type="file"
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
                    <div className="relative bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                        {paymentProof.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(paymentProof)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FileImage className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {paymentProof.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(paymentProof.size / 1024 / 1024).toFixed(2)} MB
                        </p>
</div>
                      <button
                        onClick={() => setPaymentProof(null)}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                      >
                        <X className="w-5 h-5 text-gray-500" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {(() => {
                const canSubmit = isHitpaySelected
                  ? !!shippingLocation && !isCreatingHitpayCheckout
                  : !!contactMethod && !!shippingLocation && !!paymentProof && !isUploadingProof;
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
                    {isCreatingHitpayCheckout ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                        <span>Redirecting to HitPay...</span>
                      </>
                    ) : isPlacingOrder ? (
                      <>
                        <svg className="animate-spin-fast w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>{isHitpaySelected ? 'Pay with HitPay' : 'Complete Order'}</span>
                      </>
                    )}
                  </button>
                );
              })()}
              {isUploadingProof && !isHitpaySelected && (
                <div className="mt-2 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading payment proof...
                </div>
              )}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl p-5 md:p-6 sticky top-24 border border-slate-200 dark:border-slate-800 transition-all">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span>Final Summary</span>
                  </h2>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50">
                    Step 2 Review
                  </span>
                </div>

                {/* Customer Info Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 mb-4 text-xs border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <p className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> {fullName}
                  </p>
                  <p className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> {email}
                  </p>
                  <p className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {phone}
                  </p>
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">{address}</p>
                      <p>{barangay}, {city}</p>
                      <p>{state} {zipCode}</p>
                    </div>
                  </div>
                </div>

                {/* Order Items with Profile Thumbnails */}
                <div className="space-y-3 mb-4 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
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
                      <div key={index} className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 relative flex items-center justify-center">
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
                              <Package className="w-5 h-5 text-slate-400" />
                            )}
                            <span className="absolute bottom-0 right-0 bg-slate-900/90 text-white font-extrabold text-[9px] px-1 py-0.2 rounded-tl">
                              x{item.quantity}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-gray-900 dark:text-white text-xs truncate">{item.product.name}</p>
                            {item.variation && (
                              <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{item.variation.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-gray-900 dark:text-white text-xs">
                            ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                          {hasProductDiscount && savedAmount > 0 && (
                            <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              -₱{savedAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-slate-400 font-medium">
                    <span>Subtotal</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                    </span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30">
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

                  {hitpayFee > 0 && (
                    <div className="flex justify-between items-center p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30">
                      <span className="flex items-center gap-1 font-bold">
                        <CreditCard className="w-3.5 h-3.5" />
                        HitPay Fee (3%)
                      </span>
                      <span className="font-extrabold">
                        ₱{hitpayFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}

                  {/* Grand Total Card */}
                  <div className="mt-4 pt-1">
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
  );
};

export default Checkout;

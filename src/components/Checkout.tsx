import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, Package, CreditCard, Sparkles, Heart, Copy, Check, MessageCircle, Tag, XCircle, CheckCircle, Upload, X, FileImage, Loader2, Info, Wallet } from 'lucide-react';

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
        .eq('code', code)
        .eq('active', true)
        .single();

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
        <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span className="font-heading text-lg font-extrabold text-gray-900 dark:text-white">Checkout</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold border border-[#3C6CA8]/20 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40">
                Step 1 of 2: Information
              </span>
            </div>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#3C6CA8] transition-colors cursor-pointer"
              aria-label="Return to Cart"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Cart
            </button>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-900">
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
            <button
              onClick={onBack}
              className="text-gray-700 hover:text-gold-600 font-medium mb-4 md:mb-6 flex items-center gap-2 transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm md:text-base">Back to Cart</span>
            </button>

            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-black to-gray-900 bg-clip-text text-transparent mb-6 md:mb-8 flex items-center gap-2">
              Checkout
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-gold-600" />
            </h1>

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
                <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                  <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="bg-gradient-to-br from-gold-500 to-gold-600 p-2 rounded-xl">
                      <Package className="w-5 h-5 md:w-6 md:h-6 text-black" />
                    </div>
                    Customer Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="input-field"
                        placeholder="Juan Dela Cruz"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field"
                        placeholder="juan@gmail.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="input-field"
                        placeholder="09XX XXX XXXX"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                  <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 md:mb-6 flex items-center gap-2">
                    <div className="bg-gradient-to-br from-gold-500 to-gold-600 p-2 rounded-xl">
                      <Package className="w-5 h-5 md:w-6 md:h-6 text-black" />
                    </div>
                    Shipping Address
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="input-field"
                        placeholder="123 Rizal Street"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Barangay *
                      </label>
                      <input
                        type="text"
                        value={barangay}
                        onChange={(e) => setBarangay(e.target.value)}
                        className="input-field"
                        placeholder="Brgy. San Antonio"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City *
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="input-field"
                          placeholder="Quezon City"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Province *
                        </label>
                        <input
                          type="text"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className="input-field"
                          placeholder="Metro Manila"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP/Postal Code *
                      </label>
                      <input
                        type="text"
                        value={zipCode}
                        onChange={(e) => setZipCode(e.target.value)}
                        className="input-field"
                        placeholder="1100"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Location Selection */}
                <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                  <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-2 md:mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 md:w-6 md:h-6 text-gold-600" />
                    Choose Shipping Location *
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                    Shipping rates apply to small pouches (4.1 × 9.5 inches) with a capacity of up to 3 pens. For bulk orders exceeding this size, our team will contact you for the adjusted shipping fees.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {shippingLocations.map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setShippingLocation(loc.id as 'LUZON' | 'VISAYAS' | 'MINDANAO' | 'MAXIM')}
                        className={`p-3 rounded-lg border-2 transition-all ${shippingLocation === loc.id
                          ? 'border-navy-900 bg-gold-50'
                          : 'border-gray-200 hover:border-navy-700'
                          }`}
                      >
                        <p className="font-semibold text-navy-900 text-sm">{loc.id.replace('_', ' & ')}</p>
                        <p className="text-xs text-gray-500">₱{loc.fee.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={!isDetailsValid}
                  className={`w-full py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg transition-all transform shadow-lg ${isDetailsValid
                    ? 'bg-navy-900 hover:bg-navy-800 text-white hover:scale-105 hover:shadow-xl border border-navy-900/20'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  Proceed to Payment ✨
                </button>
                  </>
                )}
              </div>

              {/* Order Summary Sidebar */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-xl p-5 md:p-6 sticky top-24 border-2 border-navy-700/30">
                  <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 md:mb-6 flex items-center gap-2">
                    Order Summary
                    <Sparkles className="w-5 h-5 text-gold-600" />
                  </h2>

                  <div className="space-y-4 mb-6">
                    {cartItems.map((item, index) => {
                      // Determine if this item has a product-level discount
                      const line = pricing.lines[index];
                      const hasVariation = !!item.variation;
                      const originalPrice = hasVariation
                        ? item.variation!.price * item.quantity
                        : item.product.base_price * item.quantity;
                      const currentPrice = line ? line.lineSubtotal : item.price * item.quantity;
                      const savedAmount = originalPrice - currentPrice;
                      const hasProductDiscount = savedAmount > 0;

                      return (
                        <div key={index} className="pb-4 border-b border-gray-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-navy-900 text-sm">{item.product.name}</h4>
                              {item.variation && (
                                <p className="text-xs text-gold-600 mt-1">{item.variation.name}</p>
                              )}
                              {item.product.purity_percentage && item.product.purity_percentage > 0 ? (
                                <p className="text-xs text-gray-500 mt-1">
                                  {item.product.purity_percentage}% Purity
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <span className="font-semibold text-navy-900 text-sm">
                                ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </span>
                              {hasProductDiscount && savedAmount > 0 && (
                                <div className="flex flex-col items-end">
                                  <span className="text-xs text-gray-400 line-through">
                                    ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                  </span>
                                  <span className="text-xs text-green-600 font-medium">
                                    Save ₱{savedAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Promo Code Input */}
                    <div className="pt-2 pb-4 border-b border-gray-100">
                      <p className="text-sm font-medium text-navy-900 mb-2 flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5 text-gold-600" />
                        Have a promo code?
                      </p>
                      {hasBundleDiscount && (
                        <p className="text-xs text-amber-700 mb-2 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                          Bundle discount is active — promo codes can't be combined.
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoCode}
                          onChange={(e) => setPromoCode(e.target.value)}
                          placeholder="Enter code"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gold-400 focus:border-transparent outline-none uppercase disabled:bg-gray-100"
                          disabled={!!appliedPromo || isApplyingPromo || hasBundleDiscount}
                        />
                        {appliedPromo ? (
                          <button
                            onClick={() => {
                              setAppliedPromo(null);
                              setDiscountAmount(0);
                              setPromoCode('');
                              setPromoSuccess('');
                            }}
                            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={handleApplyPromoCode}
                            disabled={!promoCode || isApplyingPromo || hasBundleDiscount}
                            className="px-4 py-2 bg-navy-900 text-white rounded-lg text-sm font-medium hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          {promoError}
                        </p>
                      )}
                      {promoSuccess && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {promoSuccess}
                        </p>
                      )}
                    </div>

                    {hasItemDiscount || hasBundleDiscount || discountAmount > 0 ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Subtotal</span>
                          <div className="flex items-center gap-2">
                            {hasItemDiscount || hasBundleDiscount ? (
                              <span className="text-gray-400 line-through text-sm">
                                ₱{originalSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                              </span>
                            ) : null}
                            <span className="font-semibold text-green-600">
                              ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>

                        {hasItemDiscount && (
                          <div className="flex justify-between items-center bg-green-50 -mx-6 px-6 py-2 border-y border-green-100">
                            <span className="flex items-center gap-1.5 text-green-700 font-medium text-sm">
                              <Tag className="w-4 h-4" />
                              Discount on items
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              -₱{itemDiscountSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}

                        {hasBundleDiscount && (
                          <div className="flex justify-between items-center bg-green-50 -mx-6 px-6 py-2 border-y border-green-100">
                            <span className="flex items-center gap-1.5 text-green-700 font-medium text-sm">
                              <Tag className="w-4 h-4" />
                              Bundle discount
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              -₱{bundleSavings.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}

                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center bg-green-50 -mx-6 px-6 py-2 border-y border-green-100">
                            <span className="flex items-center gap-1.5 text-green-700 font-medium text-sm">
                              <Tag className="w-4 h-4" />
                              Promo ({appliedPromo?.code})
                            </span>
                            <span className="font-bold text-green-700 text-sm">
                              -₱{discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-center -mx-6 px-6 py-2 bg-gradient-to-r from-green-500 to-green-600">
                          <p className="text-white text-sm font-bold flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4" />
                            You saved ₱{(itemDiscountSavings + bundleSavings + discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 0 })}!
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span className="font-medium">₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600 text-xs">
                      <span>Shipping</span>
                      <span className="font-medium text-gold-600">
                        {shippingLocation ? `₱${shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : 'Select location'}
                      </span>
                    </div>
                    <div className="border-t-2 border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-navy-900">Total</span>
                        <span className="text-2xl font-bold text-gold-600">
                          ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      {!shippingLocation && (
                        <p className="text-xs text-red-500 mt-1 text-right">Please select shipping location</p>
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
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 shadow-xl rounded-3xl overflow-hidden border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-extrabold text-gray-900 dark:text-white">Checkout</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#3C6CA8]/10 text-[#3C6CA8] font-bold border border-[#3C6CA8]/20 dark:bg-[#3C6CA8]/20 dark:text-blue-300 dark:border-[#3C6CA8]/40">
              Step 2 of 2: Payment & Review
            </span>
          </div>
          <button
            onClick={() => setStep('details')}
            className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-[#3C6CA8] transition-colors cursor-pointer"
            aria-label="Back to Information"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Details
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-8 bg-white dark:bg-slate-900">
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
          <button
            onClick={() => setStep('details')}
            className="text-gray-700 hover:text-gold-600 font-medium mb-4 md:mb-6 flex items-center gap-2 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm md:text-base">Back to Details</span>
          </button>

          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-black to-gray-900 bg-clip-text text-transparent mb-6 md:mb-8 flex items-center gap-2">
            Payment
            <CreditCard className="w-6 h-6 md:w-7 md:h-7 text-gold-600" />
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
            {/* Payment Form */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {/* Shipping Location Selection */}
              <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-2 md:mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-gold-600" />
                  Choose Shipping Location *
                </h2>
                <p className="text-xs md:text-sm text-gray-600 mb-4 md:mb-6">
                  Shipping rates apply to small pouches (4.1 × 9.5 inches) with a capacity of up to 3 pens. For bulk orders exceeding this size, our team will contact you for the adjusted shipping fees.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {shippingLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setShippingLocation(loc.id as 'LUZON' | 'VISAYAS' | 'MINDANAO' | 'MAXIM')}
                      className={`p-4 rounded-lg border-2 transition-all flex items-center justify-between ${shippingLocation === loc.id
                        ? 'border-navy-900 bg-gold-50'
                        : 'border-gray-200 hover:border-navy-700'
                        }`}
                    >
                      <div className="text-left">
                        <p className="font-semibold text-navy-900">{loc.id.replace('_', ' & ')}</p>
                        <p className="text-sm text-gray-500">₱{loc.fee.toLocaleString()}</p>
                      </div>
                      {shippingLocation === loc.id && (
                        <div className="w-6 h-6 bg-gold-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 md:mb-6 flex items-center gap-2">
                  <div className="bg-gradient-to-br from-gold-500 to-gold-600 p-2 rounded-xl">
                    <CreditCard className="w-5 h-5 md:w-6 md:h-6 text-black" />
                  </div>
                  Payment Method
                </h2>

                <div className="grid grid-cols-1 gap-3 mb-6">
                  {/* HitPay option (cards / e-wallets) */}
                  <div
                    className={`rounded-lg border-2 transition-all overflow-hidden ${isHitpaySelected
                      ? 'border-navy-900'
                      : 'border-gray-200 hover:border-navy-700'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentMethod(HITPAY_METHOD_ID)}
                      className="w-full p-4 flex items-center justify-between text-left bg-white cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isHitpaySelected ? 'border-navy-900' : 'border-gray-300'}`}>
                          {isHitpaySelected && <div className="w-2.5 h-2.5 rounded-full bg-navy-900" />}
                        </div>
                        <div>
                          <p className="font-semibold text-navy-900 text-sm md:text-base leading-tight">
                            Credit/Debit Cards and e-Wallets
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5 font-medium">
                            <span>Secure checkout via HitPay</span>
                            <span className="text-navy-700 font-bold bg-navy-50/80 px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
                              (Subject to a 3% processing fee)
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="px-2 py-1 rounded bg-white border border-gray-200 text-[10px] font-bold text-gray-700">QRPH</span>
                        <span className="px-2 py-1 rounded bg-white border border-gray-200 text-[10px] font-bold text-gray-700">GCash</span>
                        <span className="px-2 py-1 rounded bg-white border border-gray-200 text-[10px] font-bold text-gray-700">Maya</span>
                        <span className="px-2 py-1 rounded bg-white border border-gray-200 text-[10px] font-bold text-gray-700">Billease</span>
                        <span className="px-2 py-1 rounded bg-white border border-gray-200 text-[10px] font-bold text-gray-700">VISA</span>
                      </div>
                    </button>
                    {isHitpaySelected && (
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 text-xs md:text-sm text-gray-600 text-center">
                        You'll be redirected to HitPay to complete your purchase securely.
                      </div>
                    )}
                  </div>

                  {paymentMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedPaymentMethod(method.id)}
                      className={`p-4 rounded-lg border-2 transition-all flex items-center justify-between ${selectedPaymentMethod === method.id
                        ? 'border-navy-900 bg-gold-50'
                        : 'border-gray-200 hover:border-navy-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedPaymentMethod === method.id ? 'border-navy-900' : 'border-gray-300'}`}>
                          {selectedPaymentMethod === method.id && <div className="w-2.5 h-2.5 rounded-full bg-navy-900" />}
                        </div>
                        <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-gold-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-navy-900">{method.name}</p>
                          <p className="text-sm text-gray-500">{method.account_name}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {!isPaymongoSelected && paymentMethodInfo && (
                  <div className="bg-gold-50 rounded-lg p-6 border border-navy-600">
                    <h3 className="font-semibold text-navy-900 mb-4">Payment Details</h3>
                    <div className="space-y-2 text-sm text-gray-700 mb-4">
                      <p><strong>Account Number:</strong> {paymentMethodInfo.account_number}</p>
                      <p><strong>Account Name:</strong> {paymentMethodInfo.account_name}</p>
                      <p><strong>Amount to Pay:</strong> <span className="text-xl font-bold text-gold-600">₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span></p>
                    </div>

                    {paymentMethodInfo.qr_code_url && (
                      <div className="flex justify-center">
                        <div className="bg-white p-4 rounded-lg">
                          <img
                            src={paymentMethodInfo.qr_code_url}
                            alt="Payment QR Code"
                            className="w-48 h-48 object-contain"
                          />
                          <p className="text-xs text-center text-gray-500 mt-2">Scan to pay</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
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

              {/* Additional Notes */}
              <div className="bg-white rounded-2xl shadow-lg p-5 md:p-6 border-2 border-navy-700/30">
                <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 flex items-center gap-2">
                  <div className="bg-gradient-to-br from-gold-500 to-gold-600 p-2 rounded-xl">
                    <MessageCircle className="w-5 h-5 text-black" />
                  </div>
                  Order Notes (Optional)
                </h2>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  rows={4}
                  placeholder="Any special instructions or notes for your order..."
                />
              </div>

              {(() => {
                const canSubmit = isHitpaySelected
                  ? !!shippingLocation && !isCreatingHitpayCheckout
                  : !!contactMethod && !!shippingLocation && !!paymentProof && !isUploadingProof;
                return (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!canSubmit || isPlacingOrder}
                    className={`w-full py-3 md:py-4 rounded-2xl font-bold text-base md:text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                      canSubmit && !isPlacingOrder
                        ? 'bg-navy-900 hover:bg-navy-800 text-white hover:shadow-xl transform hover:scale-105 border border-navy-900/20'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isCreatingHitpayCheckout ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Redirecting to HitPay...
                      </>
                    ) : isPlacingOrder ? (
                      <>
                        <svg className="animate-spin-fast w-5 h-5" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                        </svg>
                        Processing Order...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                        {isHitpaySelected ? 'Pay with HitPay' : 'Complete Order'}
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
              <div className="bg-white rounded-2xl shadow-xl p-5 md:p-6 sticky top-24 border-2 border-navy-700/30">
                <h2 className="text-lg md:text-xl font-bold text-navy-900 mb-4 md:mb-6 flex items-center gap-2">
                  Final Summary
                  <Sparkles className="w-5 h-5 text-gold-600" />
                </h2>

                {/* Customer Info */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm">
                  <p className="font-semibold text-navy-900 mb-2">{fullName}</p>
                  <p className="text-gray-600">{email}</p>
                  <p className="text-gray-600">{phone}</p>
                  <div className="mt-3 pt-3 border-t border-gray-200 text-gray-600">
                    <p>{address}</p>
                    <p>{barangay}</p>
                    <p>{city}, {state} {zipCode}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {cartItems.map((item, index) => {
                    const hasVariation = !!item.variation;
                    const originalPrice = hasVariation
                      ? item.variation!.price * item.quantity
                      : item.product.base_price * item.quantity;
                    const currentPrice = item.price * item.quantity;
                    const savedAmount = originalPrice - currentPrice;
                    const hasProductDiscount = savedAmount > 0;

                    return (
                      <div key={index} className="pb-3 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 pr-2">
                            <p className="font-medium text-navy-900 text-xs">{item.product.name}</p>
                            {item.variation && (
                              <p className="text-xs text-gold-600">{item.variation.name}</p>
                            )}
                            <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-navy-900 text-xs">
                              ₱{currentPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                            </span>
                            {hasProductDiscount && savedAmount > 0 && (
                              <div className="flex flex-col items-end">
                                <span className="text-xs text-gray-400 line-through">
                                  ₱{originalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                </span>
                                <span className="text-xs text-green-600">
                                  -₱{savedAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing */}
                <div className="space-y-3">
                  {/* Subtotal with discount pricing */}
                  {discountAmount > 0 ? (
                    <>
                      {/* Discounted Subtotal Display */}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Subtotal</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 line-through text-sm">
                            ₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                          <span className="font-semibold text-green-600">
                            ₱{(totalPrice - discountAmount).toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>

                      {/* Savings Badge */}
                      <div className="flex justify-between items-center bg-green-50 -mx-6 px-6 py-2.5 border-y border-green-100">
                        <span className="flex items-center gap-1 text-green-700 font-medium text-xs">
                          <Tag className="w-3.5 h-3.5" />
                          Saved with {appliedPromo?.code}
                        </span>
                        <span className="font-bold text-green-700 text-sm">
                          -₱{discountAmount.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium">₱{totalPrice.toLocaleString('en-PH', { minimumFractionDigits: 0 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-600 text-xs">
                    <span>Shipping</span>
                    <span className="font-medium text-gold-600">
                      {shippingLocation ? `₱${shippingFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })} (${shippingLocation.replace('_', ' & ')})` : 'Select location'}
                    </span>
                  </div>
                  {hitpayFee > 0 && (
                    <div className="flex justify-between text-gray-600 text-xs bg-navy-50/50 -mx-6 px-6 py-1.5 border-y border-navy-100/50">
                      <span className="flex items-center gap-1 text-navy-800 font-bold">
                        <CreditCard className="w-3.5 h-3.5 text-navy-750" />
                        HitPay Processing Fee (3%)
                      </span>
                      <span className="font-bold text-navy-800">
                        ₱{hitpayFee.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-navy-900">Total</span>
                      <span className="text-2xl font-bold text-gold-600">
                        ₱{finalTotal.toLocaleString('en-PH', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                    {!shippingLocation && (
                      <p className="text-xs text-red-500 mt-1 text-right">Please select shipping location</p>
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
};

export default Checkout;

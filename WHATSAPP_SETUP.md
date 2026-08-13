# WhatsApp Contact Setup Guide

## 🔧 How to Add Your WhatsApp Number

Your website now has WhatsApp contact buttons. Follow these simple steps to configure your WhatsApp number:

---

## Step 1: Get Your WhatsApp Number Ready

Format your WhatsApp number correctly:
- **Include country code** (without + symbol)
- **No spaces, dashes, or special characters**

### Examples:

**US Number:** `+1 (555) 123-4567`  
**Formatted:** `15551234567`

**Philippines:** `+63 912 345 6789`  
**Formatted:** `639123456789`

**UK:** `+44 7123 456789`  
**Formatted:** `447123456789`

---

## Step 2: Update the Code

You need to update the WhatsApp number in **TWO** files:

### File 1: Header.tsx

**Location:** `src/components/Header.tsx`

**Find this line (around line 16):**
```typescript
const whatsappNumber = '1234567890'; // Change this to your WhatsApp number
```

**Replace with your number:**
```typescript
const whatsappNumber = '639123456789'; // Your actual WhatsApp number
```

---

### File 2: Footer.tsx

**Location:** `src/components/Footer.tsx`

**Find this line (around line 8):**
```typescript
const whatsappNumber = '1234567890'; // Change this to your WhatsApp number
```

**Replace with your number:**
```typescript
const whatsappNumber = '639123456789'; // Your actual WhatsApp number
```

---

## Step 3: Customize the Message (Optional)

You can also customize the pre-filled message that appears when customers click the WhatsApp button.

### In Header.tsx (line 17):
```typescript
const whatsappMessage = encodeURIComponent('Hi! I am interested in your peptide products.');
```

### In Footer.tsx (line 9):
```typescript
const whatsappMessage = encodeURIComponent('Hi! I would like to inquire about your peptide products.');
```

**Change to whatever you want:**
```typescript
const whatsappMessage = encodeURIComponent('Hello! I want to order peptides.');
```

---

## Step 4: Test It!

1. Save your changes
2. Restart the development server if needed:
   ```bash
   npm run dev
   ```
3. Click the WhatsApp button
4. It should open WhatsApp with your number and the pre-filled message

---

## 📍 Where the WhatsApp Buttons Appear

### Desktop:
- **Header Navigation** - Green "Contact via WhatsApp" button next to Products link
- **Footer** - Large green "Chat on WhatsApp" button in the center

### Mobile:
- **Mobile Menu** - Green WhatsApp button when you open the hamburger menu
- **Footer** - Same green WhatsApp button

---

## 🎨 Button Appearance

The WhatsApp buttons are styled with:
- ✅ Green background (`bg-green-500`)
- ✅ WhatsApp icon (message circle)
- ✅ Clear call-to-action text
- ✅ Opens in new tab
- ✅ Pre-filled message for easy customer contact

---

## 🔍 Complete Example

Here's a complete example with a Philippines number:

**Header.tsx:**
```typescript
const whatsappNumber = '639171234567'; 
const whatsappMessage = encodeURIComponent('Hello! I want to order BPC-157.');
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
```

**Footer.tsx:**
```typescript
const whatsappNumber = '639171234567';
const whatsappMessage = encodeURIComponent('Hi! I would like to know more about your peptides.');
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;
```

---

## ❓ Troubleshooting

### Button doesn't work?
- ✅ Check that WhatsApp is installed on the device
- ✅ Verify the number format is correct (no spaces or special characters)
- ✅ Make sure the number is registered on WhatsApp

### Opens wrong number?
- ✅ Double-check you updated BOTH files (Header.tsx and Footer.tsx)
- ✅ Clear browser cache and refresh

### Message doesn't appear?
- ✅ Special characters in message need to be URL encoded
- ✅ Use `encodeURIComponent()` wrapper as shown above

---

## 🚀 Quick Update Commands

```bash
# 1. Edit the files
nano src/components/Header.tsx
nano src/components/Footer.tsx

# 2. Search for "1234567890" and replace with your number

# 3. Save and restart
npm run dev
```

---

## 📱 What Happens When Customer Clicks?

1. Customer clicks "Contact via WhatsApp" button
2. WhatsApp Web or App opens automatically
3. Your number is already selected
4. A pre-filled message appears
5. Customer can edit the message or send as-is
6. Conversation starts in your WhatsApp!

---

## ✅ Summary

**Two Files to Update:**
1. `src/components/Header.tsx` - Line 16
2. `src/components/Footer.tsx` - Line 8

**Format:** Country code + number (no spaces, no + symbol)

**Example:** `639123456789` for Philippines, `15551234567` for US

That's it! Your customers can now easily reach you via WhatsApp! 💬


// src/constants/shopInfo.js

export const SHOP_INFO = {
  name: "عاصم الیکٹرک الیکٹرونکس اینڈ سولر ہاؤس",
  nameEn: "Asim Electric Electronics & Solar House",
  address: "مین بازار بخاری ٹاؤن، نزد بجلی گھر اسٹاپ، جڑانوالہ روڈ، فیصل آباد",
  phone1: "Faqir Hussain 0300 7262129",
  phone2: "PTCL 041 8711575",
  phone3: "Shop 0315 7262129",
  urduBanner:
    "یہاں پر چائنا فٹنگ، پی وی سی پائپ، چائنا ڈکٹ، وائرنگ تار اور پیکو لائٹ کی تمام اسیسریز ہول سیل ریٹ پر دستیاب ہیں۔",
  urduTerms:
    `الیکٹرانک اور چائنا کے اسپیئر پارٹس کی واپسی اور تبدیلی ہرگز نہیں ہوگی۔
      کٹی ہوئی تار یا کھلا ہوا کوائل قابلِ واپسی نہیں ہوں گے۔`,
  devBy:
    "Software developed by: Creative Babar / 03098325271 or visit website www.digitalglobalschool.com",
};

// Best Urdu fonts for clear, neat and clean printing
export const URDU_FONT = `'Jameel Noori Nastaleeq', 'Mehr Nastaliq', 'Noto Nastaliq Urdu', 'Alvi Lahori Nastaleeq', 'Urdu Typesetting', 'Pak Nastaleeq', 'Nafees Nastaleeq', serif`;

// Google Fonts link - using Noto Nastaliq Urdu which is clean and clear
export const GOOGLE_FONT_LINK = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Ensure Urdu text is crisp and clear */
  .shop-urdu, .shop-addr, .banner, .terms, [dir="rtl"] {
    font-family: 'Jameel Noori Nastaleeq', 'Mehr Nastaliq', 'Noto Nastaliq Urdu', 'Alvi Lahori Nastaleeq', 'Urdu Typesetting', 'Pak Nastaleeq', serif;
    font-weight: 500;
    letter-spacing: normal;
    font-smooth: antialiased;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  
  /* Better print quality */
  @media print {
    .shop-urdu, .shop-addr, .banner, .terms {
      font-weight: 600;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }
</style>`;

// Export helper for building HTML head with shop info
export const getShopHTMLHead = () => {
  return `
    <meta charset="utf-8">
    ${GOOGLE_FONT_LINK}
  `;
};

// Export helper for building shop header HTML
export const getShopHeaderHTML = () => {
  return `
    <div class="shop-urdu">${SHOP_INFO.name}</div>
    <div class="shop-addr">${SHOP_INFO.address}</div>
    <div class="shop-phones">${SHOP_INFO.phone1}, ${SHOP_INFO.phone2}, ${SHOP_INFO.phone3}</div>
  `;
};

// Export helper for building banner HTML
export const getShopBannerHTML = () => {
  return `
    <div class="banner">${SHOP_INFO.urduBanner}</div>
  `;
};

// Export helper for building terms HTML
export const getShopTermsHTML = () => {
  return `
    <div class="terms">${SHOP_INFO.urduTerms.replace(/\n/g, "<br>")}</div>
  `;
};

// Export helper for building footer HTML
export const getShopFooterHTML = () => {
  return `
    <div class="devby">${SHOP_INFO.devBy}</div>
  `;
};


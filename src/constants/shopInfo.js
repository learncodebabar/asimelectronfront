// src/constants/shopInfo.js

export const SHOP_INFO = {
  name: "عاصم الیکٹرک اینڈ الیکٹرونکس سٹور",
  nameEn: "Asim Electric & Electronic Store",
  address: "مین بازار نہاری ٹاؤن نزد بجلی گھر سٹاپ گوجرانوالہ روڈ فیصل آباد",
  phone1: "Faqir Hussain 0300 7262129",
  phone2: "PTCL 041 8711575",
  phone3: "Shop 0315 7262129",
  urduBanner:
    "یہاں پر چانک فراڈ کی وارپس، جانچ فلک، وارنگ سیلز اور ریکارڈ کے تمام اخیری ہول سیل ریٹ پر دستیاب ہے۔",
  urduTerms:
    "الیکٹرانک اور چانٹا کے سپیئر پارٹس کی واپسی یا تبدیلی ہر صورت ممکن نہیں ہوگی۔\nبلی ہوئی آئٹم، پکلاہوا اکا ول واپس قابل واپسی نہیں ہے۔\nبارک کے سامان کی واپس کی صورت میں (7) دن کے اند پہلی ہوگی۔\nکل پیلی کلائی کی تمام واپسی قابل قبول نہیں ہوگی۔",
  devBy:
    "Software developed by: Creative Babar / 03098325271 or visit website www.digitalglobalschool.com",
};

// Also export font-related constants
export const URDU_FONT = `'Noto Nastaliq Urdu','Mehr Nastaliq','Jameel Noori Nastaleeq','Urdu Typesetting',serif`;
export const GOOGLE_FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;700&display=swap" rel="stylesheet">`;

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
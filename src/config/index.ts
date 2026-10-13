/**
 * Business & Application Configuration
 * All business details, operating hours, and catalog/menu items
 * are centrally configured here.
 */

const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

export interface MenuItem {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
}

export interface BusinessConfig {
  name: string;
  category: 'restaurant' | 'grocery' | 'salon';
  tagline: string;
  currency: string;
  hours: string;
  address: string;
  supportPhone: string;
  website: string;
  defaultLanguage: 'en' | 'hi';
  welcomeMessageEn?: string;
  welcomeMessageHi?: string;
  menuItems: MenuItem[];
}

export const businessConfig: BusinessConfig = {
  name: "Spice Garden Bistro & Cafe",
  category: "restaurant",
  tagline: "Authentic Flavors, Fresh Ingredients",
  currency: "₹",
  hours: "Monday – Sunday: 10:00 AM – 11:00 PM",
  address: "42 MG Road, Indiranagar, Bangalore, Karnataka 560038",
  supportPhone: "+91 98765 43210",
  website: "https://spicegardenbistro.example.com",
  defaultLanguage: "en",
  welcomeMessageEn: "👋 Welcome to *{businessName}*! {tagline}\n\nWe are delighted to serve you. How can we help you today?\n\nType *menu* to explore our offerings or choose an option below.",
  welcomeMessageHi: "👋 *{businessName}* में आपका स्वागत है! {tagline}\n\nहम आपकी सेवा के लिए तत्पर हैं। आज हम आपकी क्या सहायता कर सकते हैं?\n\nहमारे व्यंजन देखने के लिए *menu* टाइप करें या नीचे दिए गए विकल्पों में से चुनें।",
  menuItems: [
    {
      id: "dish_01",
      title: "Butter Chicken",
      description: "Tender chicken in rich creamy tomato cashew gravy with fenugreek",
      price: 380,
      category: "Main Course"
    },
    {
      id: "dish_02",
      title: "Paneer Tikka Masala",
      description: "Chargrilled cottage cheese cubes in spiced aromatic onion-tomato curry",
      price: 320,
      category: "Vegetarian"
    },
    {
      id: "dish_03",
      title: "Hyderabadi Dum Biryani",
      description: "Fragrant basmati rice slow-cooked with spiced chicken and saffron",
      price: 350,
      category: "Rice & Biryani"
    },
    {
      id: "dish_04",
      title: "Dal Makhani",
      description: "Overnight slow-cooked black lentils with butter and cream",
      price: 260,
      category: "Vegetarian"
    },
    {
      id: "dish_05",
      title: "Garlic Butter Naan",
      description: "Clay oven baked flatbread brushed with roasted garlic and salted butter",
      price: 70,
      category: "Breads"
    },
    {
      id: "dish_06",
      title: "Tandoori Chicken Platter",
      description: "Half chicken marinated in yogurt and Kashmiri chili, roasted in tandoor",
      price: 390,
      category: "Starters"
    },
    {
      id: "dish_07",
      title: "Crispy Veg Spring Rolls",
      description: "Golden rolls stuffed with wok-tossed cabbage, carrots and bell peppers",
      price: 210,
      category: "Starters"
    },
    {
      id: "dish_08",
      title: "Gulab Jamun (2 pcs)",
      description: "Warm fried milk dumplings soaked in cardamom and rose saffron syrup",
      price: 120,
      category: "Desserts"
    },
    {
      id: "dish_09",
      title: "Mango Lassi",
      description: "Chilled blended yogurt smoothie with sweet Alphonso mango pulp",
      price: 140,
      category: "Beverages"
    },
    {
      id: "dish_10",
      title: "Fresh Lime Soda",
      description: "Refreshing club soda with fresh lime juice, mint, and rock salt",
      price: 90,
      category: "Beverages"
    }
  ]
};

export const envConfig = {
  port: parseInt(getEnv('PORT', '3000'), 10),
  whatsappToken: getEnv('WHATSAPP_TOKEN', ''),
  phoneNumberId: getEnv('PHONE_NUMBER_ID', ''),
  whatsappBusinessAccountId: getEnv('WHATSAPP_BUSINESS_ACCOUNT_ID', ''),
  sendDelayMs: parseInt(getEnv('SEND_DELAY_MS', '1000'), 10),
  verifyToken: getEnv('VERIFY_TOKEN', 'my_secure_webhook_verify_token_2026'),
  appSecret: getEnv('APP_SECRET', ''),
  ownerPhone: getEnv('OWNER_PHONE', '919876543210'),
  adminApiKey: getEnv('ADMIN_API_KEY', 'wh_admin_secret_key_prod_2026'),
  databaseUrl: getEnv('DATABASE_URL', ''),
  redisUrl: getEnv('REDIS_URL', ''),
  metaApiVersion: 'v21.0'
};

/**
 * Business & Application Configuration
 * All business details, operating hours, and catalog/menu items
 * are centrally configured here.
 */

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
  port: parseInt(process.env.PORT || "3000", 10),
  whatsappToken: process.env.WHATSAPP_TOKEN || "",
  phoneNumberId: process.env.PHONE_NUMBER_ID || "",
  verifyToken: process.env.VERIFY_TOKEN || "my_secure_webhook_verify_token_2026",
  appSecret: process.env.APP_SECRET || "",
  ownerPhone: process.env.OWNER_PHONE || "919876543210",
  adminApiKey: process.env.ADMIN_API_KEY || "wh_admin_secret_key_prod_2026",
  databaseUrl: process.env.DATABASE_URL || "",
  redisUrl: process.env.REDIS_URL || "",
  metaApiVersion: "v21.0"
};

import {
  Customer,
  DressType,
  ColorItem,
  SizeItem,
  Product,
  InventoryTransaction,
  Order,
  PriceCategory,
  StoreSettings,
  AppUser,
} from '../types';

export const INITIAL_SIZES: SizeItem[] = [
  { SizeID: 'sz-70', SizeValue: '70', Status: 'active' },
  { SizeID: 'sz-80', SizeValue: '80', Status: 'active' },
  { SizeID: 'sz-90', SizeValue: '90', Status: 'active' },
  { SizeID: 'sz-100', SizeValue: '100', Status: 'active' },
  { SizeID: 'sz-110', SizeValue: '110', Status: 'active' },
  { SizeID: 'sz-120', SizeValue: '120', Status: 'active' },
  { SizeID: 'sz-130', SizeValue: '130', Status: 'active' },
  { SizeID: 'sz-140', SizeValue: '140', Status: 'active' },
  { SizeID: 'sz-150', SizeValue: '150', Status: 'active' },
  { SizeID: 'sz-160', SizeValue: '160', Status: 'active' },
  { SizeID: 'sz-170', SizeValue: '170', Status: 'active' },
  { SizeID: 'sz-180', SizeValue: '180', Status: 'active' },
  { SizeID: 'sz-190', SizeValue: '190', Status: 'active' },
];

export const INITIAL_COLORS: ColorItem[] = [
  { ColorID: 'c-black', ColorName: 'Black', HexCode: '#1E293B', Status: 'active' },
  { ColorID: 'c-white', ColorName: 'White', HexCode: '#F8FAFC', Status: 'active' },
  { ColorID: 'c-red', ColorName: 'Red', HexCode: '#EF4444', Status: 'active' },
  { ColorID: 'c-pink', ColorName: 'Pink', HexCode: '#EC4899', Status: 'active' },
  { ColorID: 'c-blue', ColorName: 'Blue', HexCode: '#3B82F6', Status: 'active' },
  { ColorID: 'c-green', ColorName: 'Green', HexCode: '#10B981', Status: 'active' },
  { ColorID: 'c-yellow', ColorName: 'Yellow', HexCode: '#FBBF24', Status: 'active' },
  { ColorID: 'c-purple', ColorName: 'Purple', HexCode: '#8B5CF6', Status: 'active' },
  { ColorID: 'c-orange', ColorName: 'Orange', HexCode: '#F97316', Status: 'active' },
  { ColorID: 'c-brown', ColorName: 'Brown', HexCode: '#92400E', Status: 'active' },
];

export const INITIAL_DRESS_TYPES: DressType[] = [
  { DressTypeID: 'dt-princess', Name: 'Princess Dress', Description: 'Fairytale layered ballgowns and glitter tulle dresses for little princesses', Status: 'active' },
  { DressTypeID: 'dt-party', Name: 'Party Dress', Description: 'Celebration, birthday and gala attire with bows and sequins', Status: 'active' },
  { DressTypeID: 'dt-casual', Name: 'Casual Dress', Description: 'Comfortable everyday cotton dresses for play and outing', Status: 'active' },
  { DressTypeID: 'dt-summer', Name: 'Summer Dress', Description: 'Lightweight, breathable sun dresses for beach and park', Status: 'active' },
  { DressTypeID: 'dt-flower', Name: 'Flower Dress', Description: 'Classic wedding flower girl and photoshoot ceremonial dresses', Status: 'active' },
  { DressTypeID: 'dt-floral', Name: 'Floral Dress', Description: 'Pastel and botanical flower prints in flowing cuts', Status: 'active' },
  { DressTypeID: 'dt-traditional', Name: 'Traditional Dress', Description: 'Heritage dresses with artisanal embroidery and heritage details', Status: 'active' },
  { DressTypeID: 'dt-long', Name: 'Long Dress', Description: 'Full-length graceful evening and formal banquet gowns', Status: 'active' },
  { DressTypeID: 'dt-short', Name: 'Short Dress', Description: 'Knee-length playful dresses for dance and festive movement', Status: 'active' },
  { DressTypeID: 'dt-school', Name: 'School Dress', Description: 'Refined pleated pinafores and smart everyday academy dresses', Status: 'active' },
];

export const INITIAL_PRICE_CATEGORIES: PriceCategory[] = [
  { ID: 'pc-1', Name: 'Under $10', MinPrice: 0, MaxPrice: 10 },
  { ID: 'pc-2', Name: '$10–$20', MinPrice: 10, MaxPrice: 20 },
  { ID: 'pc-3', Name: '$20–$30', MinPrice: 20, MaxPrice: 30 },
  { ID: 'pc-4', Name: '$30–$50', MinPrice: 30, MaxPrice: 50 },
  { ID: 'pc-5', Name: 'Above $50', MinPrice: 50, MaxPrice: null },
];

export const INITIAL_SETTINGS: StoreSettings = {
  StoreName: 'Girl Dress Shop',
  Tagline: 'Exquisite Couture & Everyday Dresses for Girls',
  Phone: '+1 (555) 345-9876',
  Email: 'support@girldressshop.com',
  Address: '742 Boutique Blossom Avenue, Suite 101, New York, NY 10012',
  Currency: '$',
  LowStockThreshold: 5,
  TaxRate: 0,
  ActiveRole: 'admin',
  ReceiptFooterMessage: 'Thank you for shopping at Girl Dress Shop! Returns accepted within 14 days.',
};

// Initial system administrator account for first-time access
export const INITIAL_USERS: AppUser[] = [
  {
    userId: 'user-admin-1001',
    userNumber: '1001',
    name: 'Store Administrator',
    role: 'admin',
    password: '123',
    phone: '1001',
    status: 'active',
    lastLogin: new Date().toISOString(),
  },
];

// No sample data - purely user input persistence
export const INITIAL_PRODUCTS: Product[] = [];
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_ORDERS: Order[] = [];
export const INITIAL_TRANSACTIONS: InventoryTransaction[] = [];

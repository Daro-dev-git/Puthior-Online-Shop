export type UserRole = 'admin' | 'sales_staff';

export interface AppUser {
  userId: string;
  userNumber: string; // e.g. "1001", "admin", or phone number
  name: string;
  role: UserRole;
  password: string;
  email?: string; // Valid email address for notifications and security
  receiveStockAlerts?: boolean; // Whether user receives low stock email alerts
  phone?: string;
  status: 'active' | 'inactive';
  lastLogin?: string;
}

export interface ProductImage {
  ImageID: string;
  ProductID: string;
  ImageURL: string;
  IsPrimary: boolean;
  Caption?: string;
}

export interface ProductVariant {
  VariantID: string;
  ProductID: string;
  ProductCode: string;
  Size: string; // e.g. '90', '100', '110'
  Color: string; // e.g. 'Pink', 'Blue'
  ActualPrice: number; // Wholesale/cost price
  SellingPrice: number; // Retail price
  CurrentStock: number; // Real-time available units
  MinimumStock: number; // Low stock alert threshold
  Status: 'active' | 'inactive';
}

export interface Product {
  ProductID: string;
  ProductCode: string; // SKU e.g. 'GD001'
  ProductName: string;
  Description: string;
  DressTypeID: string; // References DressType
  Brand: string;
  Status: 'active' | 'inactive';
  CreatedDate: string;
  ModifiedDate: string;
  Images: ProductImage[];
  Variants: ProductVariant[];
}

export interface DressType {
  DressTypeID: string;
  Name: string;
  Description: string;
  Status: 'active' | 'inactive';
}

export interface ColorItem {
  ColorID: string;
  ColorName: string;
  HexCode: string;
  Status: 'active' | 'inactive';
}

export interface SizeItem {
  SizeID: string;
  SizeValue: string;
  Status: 'active' | 'inactive';
}

export interface Customer {
  CustomerID: string;
  CustomerName: string;
  Phone: string;
  Email: string;
  Address: string;
  CreatedDate: string;
  TotalOrders: number;
  TotalSpend: number;
}

export type InventoryTransactionType =
  | 'Purchase'
  | 'Stock Received'
  | 'Customer Return'
  | 'Adjustment IN'
  | 'Customer Sale'
  | 'Damaged'
  | 'Lost'
  | 'Adjustment OUT'
  | 'Supplier Return';

export interface InventoryTransaction {
  TransactionID: string;
  TransactionDate: string;
  TransactionType: InventoryTransactionType;
  VariantID: string;
  ProductCode: string;
  ProductName: string;
  Size: string;
  Color: string;
  Quantity: number;
  ActualPrice: number;
  SellingPrice: number;
  TotalCost: number;
  TotalSellingValue: number;
  ReferenceID?: string; // OrderID or Invoice ID
  CustomerID?: string;
  CustomerName?: string;
  Supplier?: string;
  Notes: string;
  CreatedBy: string;
}

export interface OrderItem {
  OrderItemID: string;
  OrderID: string;
  VariantID: string;
  ProductCode: string;
  ProductName: string;
  Size: string;
  Color: string;
  Quantity: number;
  UnitPrice: number; // SellingPrice
  ActualPrice: number; // Cost price
  Subtotal: number;
  Profit: number;
  ProductImage?: string;
}

export interface Order {
  OrderID: string;
  CustomerID?: string;
  CustomerName: string;
  CustomerPhone?: string;
  CustomerAddress?: string;
  OrderDate: string;
  Status: 'completed' | 'pending' | 'cancelled';
  Subtotal: number;
  Discount: number;
  Total: number;
  Cost: number;
  Profit: number;
  PaymentMethod: 'cash' | 'card' | 'cod' | 'transfer';
  Items: OrderItem[];
  Notes?: string;
  CreatedBy: string;
}

export interface PriceCategory {
  ID: string;
  Name: string;
  MinPrice: number;
  MaxPrice: number | null; // null means unbounded (e.g. Above $50)
}

export interface StoreSettings {
  StoreName: string;
  Tagline: string;
  Phone: string;
  Email: string;
  Address: string;
  Currency: string; // e.g. '$'
  LowStockThreshold: number; // Default min stock
  TaxRate: number; // percentage e.g. 0
  ActiveRole: UserRole;
  ReceiptFooterMessage: string;
  EmailAlertsEnabled?: boolean; // Whether low-stock email alerts are enabled
  AlertEmailRecipients?: string; // Additional or custom recipient email addresses
  LastAlertEmailSent?: string; // ISO string of when last email alert was triggered
}

export interface CartItem {
  VariantID: string;
  ProductID: string;
  ProductCode: string;
  ProductName: string;
  DressTypeName: string;
  Size: string;
  Color: string;
  ActualPrice: number;
  SellingPrice: number;
  Quantity: number;
  CurrentStock: number;
  ImageURL: string;
}

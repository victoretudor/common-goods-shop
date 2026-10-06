// Shapes returned by the website's API (see src/app/api in the web project).

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type Product = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  imageUrl: string;
  stock: number;
};

export type CartItem = { id: number; quantity: number; product: Product };

export type Cart = {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
};

export type Order = {
  id: number;
  status: "placed" | "shipped" | "cancelled";
  email: string;
  fullName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  confirmationEmailSentAt: string | null;
  createdAt: string;
};

export type OrderItem = {
  id: number;
  name: string;
  unitPriceCents: number;
  quantity: number;
};

export type CheckoutDetails = {
  email: string;
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
};

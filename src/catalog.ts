export interface Product {
  id: string;
  name: string;
  priceMad: number;
  description: string;
  stock: number;
}

export const products: Product[] = [
  { id: "argan-oil-100", name: "Argan Oil 100 ml", priceMad: 129, description: "Pure cosmetic argan oil.", stock: 18 },
  { id: "ceramic-mug", name: "Handmade Ceramic Mug", priceMad: 89, description: "Hand-painted mug from Safi.", stock: 7 },
  { id: "woven-basket", name: "Woven Market Basket", priceMad: 159, description: "Traditional palm-leaf basket.", stock: 11 },
];

export function findProduct(productId: string): Product | undefined {
  return products.find((product) => product.id === productId);
}

export function hasAvailableStock(product: Product, quantity: number): boolean {
  return quantity > 0 && quantity <= product.stock;
}

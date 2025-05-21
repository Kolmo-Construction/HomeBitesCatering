import type { DessertItem, DessertLotSize } from "./types";

// Dessert items with prices
export const dessertItems: DessertItem[] = [
  { id: "petit_fours", name: "Petit Fours", price: 2.25 },
  { id: "macaroons", name: "Macaroons", price: 2.25 },
  { id: "flourless_chocolate_cake", name: "Flourless Chocolate Cake", price: 4.75 },
  { id: "cheesecake", name: "Cheesecake", price: 5.75 },
  { id: "baklava", name: "Baklava", price: 5.25 },
  { id: "cannolis", name: "Cannolis", price: 4.75 },
  { id: "mini_cannolis", name: "Mini Cannolis", price: 2.75 },
  { id: "assorted_dessert_cups", name: "Assorted dessert cups", price: 3.25 },
  { id: "pate_a_choux", name: "Pâte à Choux with Crème Pâtissière", price: 3.25 },
  { id: "baklava_rollups", name: "Baklava roll-ups", price: 3.75 },
  { id: "lemon_tartlets", name: "Lemon Tartlets", price: 2.75 },
  { id: "mille_feuille", name: "Mille feuille with cream and berries", price: 3.75 }
];

// Available lot sizes for desserts
export const dessertLotSizes: DessertLotSize[] = [36, 48, 72, 96, 144];
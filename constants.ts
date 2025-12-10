import { Product } from './types';

export const CATEGORIES = [
  'Snacks',
  'Beverages',
  'Stationery',
  'Electronics',
  'Personal Care'
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'College Ruled Notebook',
    category: 'Stationery',
    price: 3.50,
    stock: 50,
    description: 'Standard 100-page notebook for all your class notes.'
  },
  {
    id: '2',
    name: 'Energy Drink - Blue',
    category: 'Beverages',
    price: 2.99,
    stock: 24,
    description: 'Sugar-free energy boost for late night study sessions.'
  },
  {
    id: '3',
    name: 'Granola Bar',
    category: 'Snacks',
    price: 1.50,
    stock: 100,
    description: 'Healthy oat and honey granola bar.'
  },
  {
    id: '4',
    name: 'USB-C Cable',
    category: 'Electronics',
    price: 12.99,
    stock: 10,
    description: 'Fast charging durable cable, 1 meter length.'
  }
];
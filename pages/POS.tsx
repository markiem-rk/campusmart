import React, { useState, useEffect } from 'react';
import { Search, Plus, Minus, Trash2, CreditCard, CheckCircle } from 'lucide-react';
import { Product, CartItem, Transaction } from '../types';
import { getProducts, saveProducts, saveTransaction } from '../services/storageService';
import { CATEGORIES } from '../constants';

const POS: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setProducts(getProducts());
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Check stock limit
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const product = products.find(p => p.id === id);
        const maxStock = product ? product.stock : 0;
        const newQty = Math.max(1, Math.min(item.quantity + delta, maxStock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    // Simulate API delay
    setTimeout(() => {
      const transaction: Transaction = {
        id: Date.now().toString(),
        items: [...cart],
        total: cartTotal,
        timestamp: Date.now()
      };

      // Update Stock
      const updatedProducts = products.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) {
          return { ...p, stock: p.stock - cartItem.quantity };
        }
        return p;
      });

      saveProducts(updatedProducts);
      setProducts(updatedProducts);
      saveTransaction(transaction);
      
      setCart([]);
      setIsCheckingOut(false);
      setShowSuccess(true);
      
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  const filteredProducts = products.filter(p => 
    (selectedCategory === 'All' || p.category === selectedCategory) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)] gap-6">
      {/* Product Grid Section */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'All' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Items
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock === 0}
                className="flex flex-col items-start p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all text-left bg-white group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-3 flex items-center justify-center text-gray-300 group-hover:text-blue-500 transition-colors">
                  <span className="text-4xl font-light select-none">
                    {product.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 line-clamp-1 w-full">{product.name}</h3>
                <p className="text-xs text-gray-500 mb-2">{product.category}</p>
                <div className="flex justify-between items-center w-full mt-auto">
                  <span className="font-bold text-blue-600">${product.price.toFixed(2)}</span>
                  <span className={`text-xs ${product.stock < 5 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {product.stock} left
                  </span>
                </div>
              </button>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400">
                No items found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Section */}
      <div className="w-full lg:w-96 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-gray-600" />
            Current Order
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length > 0 ? (
            cart.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="font-medium text-gray-900 truncate">{item.name}</h4>
                  <p className="text-sm text-blue-600 font-semibold">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-1.5 ml-1 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
              <CreditCard className="w-12 h-12 mb-2" />
              <p>Cart is empty</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Tax (0%)</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0 || isCheckingOut}
            className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center transition-all ${
              showSuccess 
                ? 'bg-green-500' 
                : 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
            }`}
          >
            {isCheckingOut ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : showSuccess ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Payment Complete
              </>
            ) : (
              'Complete Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
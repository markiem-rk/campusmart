import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { DollarSign, ShoppingBag, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import { getProducts, getTransactions } from '../services/storageService';
import { analyzeBusinessMetrics } from '../services/geminiService';
import { Product, Transaction } from '../types';

const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiInsight, setAiInsight] = useState<string>("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    const p = getProducts();
    const t = getTransactions();
    setProducts(p);
    setTransactions(t);
  }, []);

  const generateInsights = async () => {
    setIsLoadingInsight(true);
    const insight = await analyzeBusinessMetrics(transactions, products);
    setAiInsight(insight);
    setIsLoadingInsight(false);
  };

  // Metrics
  const totalRevenue = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const lowStockCount = products.filter(p => p.stock < 10).length;
  const recentTransactions = transactions.slice(0, 5);

  // Chart Data Preparation
  const last7Transactions = transactions.slice(0, 7).reverse();
  const salesData = last7Transactions.map((t, idx) => ({
    name: `Tx ${idx + 1}`,
    amount: t.total
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="flex space-x-2">
          <button 
            onClick={generateInsights}
            disabled={isLoadingInsight}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {isLoadingInsight ? <RefreshCw className="w-4 h-4 mr-2 animate-spin"/> : <Sparkles className="w-4 h-4 mr-2"/>}
            {aiInsight ? "Refresh AI Insights" : "Get AI Insights"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 rounded-full bg-green-100 text-green-600 mr-4">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">${totalRevenue.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Items in Stock</p>
            <p className="text-2xl font-bold text-gray-900">{totalStock}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center">
          <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-gray-900">{lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* AI Insight Section */}
      {aiInsight && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100">
          <div className="flex items-start">
            <Sparkles className="w-5 h-5 text-purple-600 mt-1 mr-3 flex-shrink-0" />
            <div className="prose prose-purple max-w-none">
              <h3 className="text-lg font-semibold text-purple-900 mb-2">AI Business Analysis</h3>
              <div className="text-purple-800 whitespace-pre-line">{aiInsight}</div>
            </div>
          </div>
        </div>
      )}

      {/* Charts & Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Sales Trend</h3>
          {salesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No transactions yet
            </div>
          )}
        </div>

        {/* Recent Transactions List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 overflow-auto">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-sm mr-3">
                      ${Math.floor(tx.total)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {tx.items.length} items sold
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">${tx.total.toFixed(2)}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-10">No recent transactions</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  LogOut, 
  Store,
  Menu,
  X
} from 'lucide-react';
import { Page, User } from './types';
import { getCurrentUser, logoutUser } from './services/storageService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import POS from './pages/POS';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUser = getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    } else {
      setCurrentPage(Page.LOGIN);
    }
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setCurrentPage(Page.DASHBOARD);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentPage(Page.LOGIN);
  };

  if (!user || currentPage === Page.LOGIN) {
    return <Login onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case Page.DASHBOARD:
        return <Dashboard />;
      case Page.INVENTORY:
        return <Inventory />;
      case Page.POS:
        return <POS />;
      default:
        return <Dashboard />;
    }
  };

  const NavItem = ({ page, icon: Icon, label }: { page: Page; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentPage(page);
        setIsSidebarOpen(false);
      }}
      className={`flex items-center w-full px-6 py-4 transition-colors ${
        currentPage === page
          ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
          : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-5 h-5 mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 w-64 h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center text-blue-600">
              <Store className="w-8 h-8 mr-2" />
              <h1 className="text-xl font-bold tracking-tight">CampusMart</h1>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-500"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 py-6 space-y-1">
            <NavItem page={Page.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem page={Page.POS} icon={ShoppingCart} label="Point of Sale" />
            <NavItem page={Page.INVENTORY} icon={Package} label="Inventory" />
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">{user.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between bg-white p-4 shadow-sm z-10">
          <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-gray-800">
            {currentPage.charAt(0) + currentPage.slice(1).toLowerCase()}
          </span>
          <div className="w-6" /> {/* Spacer for centering */}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';

function Navbar() {
  const location = useLocation();
  const { activeWallets } = useWallet();
  
  return (
    <nav className="bg-gray-900 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 text-solana">
              <svg viewBox="0 0 128 128" fill="currentColor">
                <path d="M93.96 42.02H34.77c-1.69 0-3.3.8-4.32 2.17l-8.69 11.76c-.7.95-.7 2.24 0 3.19l8.69 11.76c1.02 1.37 2.62 2.17 4.32 2.17h59.19c1.69 0 3.3-.8 4.32-2.17l8.69-11.76c.7-.95.7-2.24 0-3.19l-8.69-11.76c-1.02-1.37-2.63-2.17-4.32-2.17z" />
                <path d="M93.96 76.02H34.77c-1.69 0-3.3.8-4.32 2.17l-8.69 11.76c-.7.95-.7 2.24 0 3.19l8.69 11.76c1.02 1.37 2.62 2.17 4.32 2.17h59.19c1.69 0 3.3-.8 4.32-2.17l8.69-11.76c.7-.95.7-2.24 0-3.19l-8.69-11.76c-1.02-1.37-2.63-2.17-4.32-2.17z" />
                <path d="M34.77 36.07h59.19c1.69 0 3.3-.8 4.32-2.17l8.69-11.76c.7-.95.7-2.24 0-3.19l-8.69-11.76C97.26 5.8 95.66 5 93.96 5H34.77c-1.69 0-3.3.8-4.32 2.17l-8.69 11.76c-.7.95-.7 2.24 0 3.19l8.69 11.76c1.02 1.38 2.63 2.19 4.32 2.19z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Solana Market Maker</span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <NavLink to="/" active={location.pathname === '/'}>Dashboard</NavLink>
            <NavLink to="/wallets" active={location.pathname === '/wallets'}>
              Wallets
              {activeWallets.length > 0 && (
                <span className="ml-2 bg-solana text-white text-xs px-2 py-1 rounded-full">
                  {activeWallets.length}
                </span>
              )}
            </NavLink>
            <NavLink to="/settings" active={location.pathname === '/settings'}>Settings</NavLink>
          </div>
          
          <div className="md:hidden">
            <button className="text-white">
              <div className="w-6 h-6">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link 
      to={to} 
      className={`text-sm font-medium transition-colors duration-200 flex items-center ${
        active ? 'text-white' : 'text-gray-300 hover:text-white'
      }`}
    >
      {children}
    </Link>
  );
}

export default Navbar;

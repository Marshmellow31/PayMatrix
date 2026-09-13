import { Link, useLocation } from 'react-router-dom';
import AppLogo from '../common/AppLogo.jsx';

const sections = [
  ['how-it-works', 'How it works'],
  ['fair-splits', 'Fair splits'],
  ['settle-up', 'Settle up'],
];

const PublicHeader = () => {
  const { pathname } = useLocation();

  return (
    <header className="landing-header">
      <div className="landing-container landing-header-inner">
        <Link className="landing-brand" to="/" aria-label="paymatrix home">
          <AppLogo size="sm" decorative />
          <span>paymatrix</span>
        </Link>
        <nav className="landing-nav" aria-label="Public pages">
          {sections.map(([id, label]) => (
            <Link key={id} to={pathname === '/' ? `#${id}` : `/#${id}`}>
              {label}
            </Link>
          ))}
          <Link to="/contact" aria-current={pathname === '/contact' ? 'page' : undefined}>
            Contact
          </Link>
        </nav>
        <div className="landing-header-actions">
          <Link
            className="landing-signin landing-header-contact"
            to="/contact"
            aria-current={pathname === '/contact' ? 'page' : undefined}
          >
            Contact
          </Link>
          <Link
            className="landing-signin"
            to="/login"
            aria-current={pathname === '/login' ? 'page' : undefined}
          >
            Sign in
          </Link>
          <Link
            className="landing-button landing-button-small"
            to="/register"
            aria-current={pathname === '/register' ? 'page' : undefined}
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;

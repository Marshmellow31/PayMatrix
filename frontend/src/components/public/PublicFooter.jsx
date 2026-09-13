import { Link } from 'react-router-dom';
import AppLogo from '../common/AppLogo.jsx';

const PublicFooter = () => (
  <footer className="landing-footer">
    <div className="landing-container landing-footer-inner">
      <Link className="landing-brand" to="/">
        <AppLogo size="xs" decorative />
        <span>paymatrix</span>
      </Link>
      <nav aria-label="Legal and support">
        <Link to="/privacy">Privacy</Link>
        <Link to="/terms">Terms</Link>
        <Link to="/delete-account">Delete account</Link>
        <a href="https://github.com/Marshmellow31/PayMatrix/issues" target="_blank" rel="noopener noreferrer">Support</a>
      </nav>
    </div>
  </footer>
);

export default PublicFooter;

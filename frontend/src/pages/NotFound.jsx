import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/common/Button.jsx';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      >
        <p className="text-8xl font-bold font-manrope text-surface-variant mb-4">404</p>
        <h1 className="text-2xl font-bold font-manrope text-primary mb-2">Page Not Found</h1>
        <p className="text-on-surface-variant mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;

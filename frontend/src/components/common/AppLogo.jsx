const sizes = {
  xs: 'h-8 w-8 rounded-lg',
  sm: 'h-9 w-9 rounded-xl',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-12 w-12 rounded-2xl',
};

const AppLogo = ({ size = 'md', className = '', decorative = false }) => (
  <img
    src="/logo.png"
    alt={decorative ? '' : 'PayMatrix'}
    aria-hidden={decorative || undefined}
    width="1024"
    height="1024"
    decoding="async"
    fetchPriority="high"
    className={`${sizes[size] || sizes.md} shrink-0 object-contain ${className}`}
  />
);

export default AppLogo;

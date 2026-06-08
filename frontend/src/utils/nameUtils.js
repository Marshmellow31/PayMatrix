/**
 * Name utilities to handle display logic and collisions.
 */

/**
 * Returns the first name (first word) of a full name.
 */
export const getFirstName = (fullName) => {
  if (!fullName) return '?';
  return fullName.trim().split(' ')[0];
};

/**
 * Returns up to two initials from a name (e.g., "Meet Shah" -> "MS").
 */
export const getInitials = (fullName) => {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 1).toUpperCase();
  return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
};

/**
 * Returns a short version of a name, adding disambiguation as needed:
 *   "Meet"           → first name alone if unique
 *   "Meet S."        → first name + last initial if first name clashes
 *   "Meet Shah"      → full name if even first+last-initial clashes (e.g. two "Meet S.")
 *
 * @param {string} fullName - The name to format.
 * @param {string[]} allNames - List of all names in the same context for collision check.
 */
export const getShortName = (fullName, allNames = []) => {
  if (!fullName) return '?';

  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  const firstClashes = allNames.filter(name => {
    if (!name) return false;
    return name.trim().split(/\s+/)[0].toLowerCase() === firstName.toLowerCase();
  });

  // First name is unique — done.
  if (firstClashes.length <= 1) return firstName;

  // No last name to help — return first name as-is.
  if (!lastName) return firstName;

  // Check if first + last-initial is still ambiguous.
  const initialClashes = allNames.filter(name => {
    if (!name) return false;
    const p = name.trim().split(/\s+/);
    const fn = p[0];
    const ln = p.length > 1 ? p[p.length - 1] : '';
    return (
      fn.toLowerCase() === firstName.toLowerCase() &&
      ln[0]?.toLowerCase() === lastName[0]?.toLowerCase()
    );
  });

  if (initialClashes.length <= 1) return `${firstName} ${lastName[0]}.`;

  // Both first name and initial clash — show the full name.
  return fullName.trim();
};

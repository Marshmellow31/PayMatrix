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
 * Returns a short version of a name, adding a last initial if it conflicts with others.
 * @param {string} fullName - The name to format.
 * @param {string[]} allNames - List of all names in the same context for collision check.
 */
export const getShortName = (fullName, allNames = []) => {
  if (!fullName) return '?';
  
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

  // Check if first name is unique among allNames
  // We use filter(Boolean) to ignore empty names
  const firstNameDuplicates = allNames.filter(name => {
    if (!name) return false;
    return name.trim().split(/\s+/)[0].toLowerCase() === firstName.toLowerCase();
  });

  // If first name is unique, just return it
  if (firstNameDuplicates.length <= 1) {
    return firstName;
  }

  // If not unique, return First Name + Last Initial
  return lastName ? `${firstName} ${lastName[0]}.` : firstName;
};

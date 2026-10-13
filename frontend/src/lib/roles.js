export function isAdminRole(role) {
  return role === "admin" || role === "super_admin";
}

export function canManageListings(role) {
  return role === "host" || isAdminRole(role);
}

export function roleLabelKey(role) {
  if (role === "super_admin") return "navigation.superAdminRole";
  if (role === "admin") return "navigation.adminRole";
  if (role === "host") return "navigation.hostRole";
  return "navigation.guestRole";
}

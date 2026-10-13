/** Vai trò super_admin kế thừa mọi quyền của admin. */
function isAdminRole(role) {
  return role === "admin" || role === "super_admin";
}

module.exports = { isAdminRole };

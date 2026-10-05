const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9_]{3,40}$/;

export function validateEmail(value) {
  const email = value.trim();
  if (!email) return "auth.validation.emailRequired";
  if (email.length > 255) return "auth.validation.emailLength";
  if (!EMAIL_PATTERN.test(email)) return "auth.validation.emailFormat";
  return null;
}

export function validateUsername(value) {
  if (!value.trim()) return "auth.validation.usernameRequired";
  return USERNAME_PATTERN.test(value.trim().toLowerCase()) ? null : "auth.validation.usernameFormat";
}

export function validateIdentifier(value) {
  const identifier = value.trim();
  if (!identifier) return "auth.validation.identifierRequired";
  if (identifier.length > 255) return "auth.validation.identifierFormat";
  if (identifier.includes("@")) return validateEmail(identifier) ? "auth.validation.identifierFormat" : null;
  return USERNAME_PATTERN.test(identifier.toLowerCase()) ? null : "auth.validation.identifierFormat";
}

export function validateFullName(value) {
  const length = value.trim().length;
  if (!length) return "auth.validation.nameRequired";
  return length < 2 || length > 100 ? "auth.validation.nameLength" : null;
}

export function validateLoginPassword(value) {
  if (!value) return "auth.validation.passwordRequired";
  return value.length > 1024 ? "auth.validation.invalidField" : null;
}

export function validateNewPassword(value) {
  if (!value) return "auth.validation.passwordRequired";
  if (value.length < 8) return "auth.validation.passwordLength";
  return value.length > 72 || new TextEncoder().encode(value).length > 72
    ? "auth.validation.passwordLength" : null;
}

export function validateConfirmation(value, password) {
  if (!value) return "auth.validation.confirmRequired";
  return value === password ? null : "auth.passwordMismatch";
}

/** Chỉ dùng tên field từ lỗi Joi; nội dung server không được đưa lên giao diện. */
export function validationFields(error) {
  if (error?.status !== 400 || error?.data?.message !== "Validation failed") return [];
  const fields = error.data.errors;
  return fields && typeof fields === "object" && !Array.isArray(fields) ? Object.keys(fields) : [];
}

export function serverFieldErrors(fields, messages) {
  return Object.fromEntries(Object.entries(messages).filter(([field]) => fields.includes(field)));
}

/** Chỉ ánh xạ lỗi trùng đã biết từ API đăng ký; lỗi khác giữ thông báo chung. */
export function registrationConflictField(error) {
  if (error?.status !== 409) return null;
  if (error?.data?.message === "Email already exists") return "email";
  if (error?.data?.message === "Username already exists") return "username";
  return null;
}

/** Phân biệt sai thông tin đăng nhập với các lỗi 401 khác như phiên liên kết hết hạn. */
export function isInvalidCredentials(error) {
  return error?.status === 401 && error?.data?.message === "Invalid username, email or password";
}

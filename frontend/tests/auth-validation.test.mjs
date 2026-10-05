import test from "node:test";
import assert from "node:assert/strict";
import {
  isInvalidCredentials,
  registrationConflictField,
  serverFieldErrors,
  validateConfirmation,
  validateEmail,
  validateFullName,
  validateIdentifier,
  validateLoginPassword,
  validateNewPassword,
  validateUsername,
  validationFields,
} from "../src/lib/authValidation.js";

test("Định dạng email, username và tên khớp giới hạn đăng ký", () => {
  assert.equal(validateEmail(" "), "auth.validation.emailRequired");
  assert.equal(validateEmail("bad@"), "auth.validation.emailFormat");
  assert.equal(validateEmail(" person@example.com "), null);
  assert.equal(validateEmail(`${"a".repeat(244)}@example.com`), "auth.validation.emailLength");
  assert.equal(validateUsername("ab"), "auth.validation.usernameFormat");
  assert.equal(validateUsername("User_123"), null);
  assert.equal(validateFullName(" A "), "auth.validation.nameLength");
  assert.equal(validateFullName(" Nguyễn Văn A "), null);
});

test("Đăng nhập nhận username hoặc email và không áp quy tắc mật khẩu mới", () => {
  assert.equal(validateIdentifier("user_123"), null);
  assert.equal(validateIdentifier("USER@example.com"), null);
  assert.equal(validateIdentifier("bad@"), "auth.validation.identifierFormat");
  assert.equal(validateLoginPassword("short"), null);
  assert.equal(validateLoginPassword(""), "auth.validation.passwordRequired");
});

test("Mật khẩu mới kiểm tra số ký tự, byte UTF-8 và xác nhận", () => {
  assert.equal(validateNewPassword("1234567"), "auth.validation.passwordLength");
  assert.equal(validateNewPassword("12345678"), null);
  assert.equal(validateNewPassword("é".repeat(36)), null);
  assert.equal(validateNewPassword("é".repeat(37)), "auth.validation.passwordLength");
  assert.equal(validateConfirmation("different", "password"), "auth.passwordMismatch");
});

test("Lỗi Joi chỉ dùng tên field đã cho phép, không hiện thông điệp thô", () => {
  const error = { status: 400, data: { message: "Validation failed", errors: {
    email: "Internal detail", unknown: "Do not show",
  } } };
  assert.deepEqual(validationFields(error), ["email", "unknown"]);
  assert.deepEqual(serverFieldErrors(validationFields(error), {
    email: "auth.validation.emailFormat", password: "auth.validation.invalidField",
  }), {
    email: "auth.validation.emailFormat",
  });
  assert.deepEqual(validationFields({ status: 409, data: error.data }), []);
});

test("Lỗi trùng email hoặc tên đăng nhập được gắn đúng trường đăng ký", () => {
  assert.equal(registrationConflictField({ status: 409, data: { message: "Email already exists" } }), "email");
  assert.equal(registrationConflictField({ status: 409, data: { message: "Username already exists" } }), "username");
  assert.equal(registrationConflictField({ status: 409, data: { message: "Invalid or conflicting data" } }), null);
  assert.equal(registrationConflictField({ status: 400, data: { message: "Email already exists" } }), null);
});

test("Chỉ lỗi sai định danh hoặc mật khẩu dùng thông báo đăng nhập chung", () => {
  assert.equal(isInvalidCredentials({ status: 401, data: { message: "Invalid username, email or password" } }), true);
  assert.equal(isInvalidCredentials({ status: 401, data: { message: "Google linking session expired" } }), false);
  assert.equal(isInvalidCredentials({ status: 500, data: { message: "Invalid username, email or password" } }), false);
});

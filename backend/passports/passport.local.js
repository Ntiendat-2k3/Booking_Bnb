const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const UserRepository = require("../repositories/user.repository");
const userRepo = new UserRepository();

module.exports = new LocalStrategy(
  {
    usernameField: "email",
    passwordField: "password",
    session: false,
  },
  async (identifier, password, done) => {
    try {
      const user = identifier.includes("@")
        ? await userRepo.findByEmail(identifier)
        : await userRepo.findByUsername(identifier.toLowerCase());
      if (!user) return done(null, false, { message: "Invalid username, email or password" });

      if (user.provider !== "local") {
        return done(null, false, { message: "Use social login for this account" });
      }

      if (!user.password_hash) return done(null, false, { message: "Invalid username, email or password" });

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return done(null, false, { message: "Invalid username, email or password" });

      if (user.status !== "active") return done(null, false, { message: "User blocked" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
);

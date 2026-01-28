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
  async (email, password, done) => {
    try {
      const user = await userRepo.findByEmail(email);
      if (!user) return done(null, false, { message: "Invalid email or password" });

      if (user.provider !== "local") {
        return done(null, false, { message: "Use Google login for this account" });
      }

      if (!user.password_hash) return done(null, false, { message: "Invalid email or password" });

      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) return done(null, false, { message: "Invalid email or password" });

      if (user.status !== "active") return done(null, false, { message: "User blocked" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
);

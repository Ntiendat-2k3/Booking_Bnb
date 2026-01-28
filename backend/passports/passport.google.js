const GoogleStrategy = require("passport-google-oauth2").Strategy;
const authService = require("../services/auth.service");

module.exports = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ["email", "profile"],
    passReqToCallback: true,
  },
  async function (req, _accessToken, _refreshToken, profile, done) {
    try {
      const provider_id = profile.id; // google sub
      const email = profile.email || profile.emails?.[0]?.value || null;
      const full_name = profile.displayName || "Google User";
      const avatar_url = profile.picture || profile.photos?.[0]?.value || null;

      if (!email) return done(null, false, { message: "Google account has no email" });

      const user = await authService.findOrCreateGoogleUser({
        email,
        full_name,
        avatar_url,
        provider_id,
      });

      return done(null, user);
    } catch (e) {
      return done(e);
    }
  }
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx}",
    "./src/components/**/*.{js,jsx}",
    "./src/pages/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Airbnb-like brand pink
        brand: {
          DEFAULT: "#FF385C",
          dark: "#E61E4D",
        },
      },
    },
  },
  plugins: [],
};

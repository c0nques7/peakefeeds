/** @type {import('tailwindcss').Config} */
module.exports = {
  // 👇 THIS IS CRITICAL
  darkMode: 'class', 
  
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/layout/**/*.{js,ts,jsx,tsx,mdx}", // (Optional: usually covered by components/**/*)
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


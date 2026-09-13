/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: "#0B0F19",
        panelbg: "#111827",
        panelborder: "#1F2937",
        riskLow: "#10B981",
        riskModerate: "#F59E0B",
        riskHigh: "#F97316",
        riskSevere: "#EF4444"
      }
    },
  },
  plugins: [],
}

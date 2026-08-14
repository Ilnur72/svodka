import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  // `host: true` — 0.0.0.0 да тинглайди, яъни ситуацион марказ экрани ва
  // телефон каби тармоқдаги бошқа қурилмалар ҳам оча олади. Стандарт
  // ҳолатда Vite фақат localhost'га боғланади.
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
  build: {
    // Маълумот энди API'дан келади; фақат оғир диаграмма кутубхонаси алоҳида
    // чанкда қолади — иловa қобиғи у етиб келгунича парс қилинаверади.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/recharts") || id.includes("node_modules/d3-"))
            return "charts";
        },
      },
    },
  },
});

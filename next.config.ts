import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Dev corre com Turbopack (Serwist desativado em dev); o build de produção
  // usa webpack (`next build --webpack`) porque o Serwist ainda não suporta
  // Turbopack. O objeto vazio silencia o erro de config mista no dev.
  turbopack: {},
};

export default withSerwist(nextConfig);

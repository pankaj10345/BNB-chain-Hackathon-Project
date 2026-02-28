import "./globals.css";

export const metadata = {
  title: "PredictArb Dashboard",
  description: "AI-powered autonomous arbitrage monitor on BNB Chain",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

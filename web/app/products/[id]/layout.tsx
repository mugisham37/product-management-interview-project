import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Product - Product Management Dashboard",
  description: "Edit product information and update your inventory",
};

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
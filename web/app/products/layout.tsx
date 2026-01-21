import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Products - Product Management Dashboard",
  description: "Manage your products - create, edit, and organize your inventory",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
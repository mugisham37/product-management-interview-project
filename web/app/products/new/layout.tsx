import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add New Product - Product Management Dashboard",
  description: "Add a new product to your inventory",
};

export default function NewProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
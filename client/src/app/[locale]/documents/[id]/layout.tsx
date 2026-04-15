import type { ReactNode } from "react";
import { DocumentFloatingChat } from "@/components/DocumentFloatingChat";

export default async function DocumentIdLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <>
      {children}
      <DocumentFloatingChat documentId={id} />
    </>
  );
}

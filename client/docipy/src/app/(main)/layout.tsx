import { AuthenticatedLayoutGate } from "@/components/AuthenticatedLayoutGate";

export default function MainWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthenticatedLayoutGate>{children}</AuthenticatedLayoutGate>;
}

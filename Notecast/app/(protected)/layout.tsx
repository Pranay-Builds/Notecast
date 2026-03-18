import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import Sidebar from "../components/Sidebar";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">

      <Sidebar />

      <main className="flex-1 overflow-y-auto bg-[#121212]">
          {children}
      </main>

    </div>
  );
}
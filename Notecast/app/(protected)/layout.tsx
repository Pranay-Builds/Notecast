import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { prisma } from "@/lib/prisma";
import Sidebar from "../components/Sidebar";
import MobileNavbar from "../components/MobileNavbar";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session?.user?.id,
    },
  });

  if (!user?.hasOnboarded) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNavbar />

        <main className="flex-1 overflow-y-auto bg-[#121212]">{children}</main>
      </div>
    </div>
  );
}

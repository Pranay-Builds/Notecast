import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OnboardingClient from "./OnboardingClient"

export default async function Onboarding() {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session?.user?.id,
    },
  });

  if (user?.hasOnboarded) {
    redirect("/dashboard");
  }

  return <OnboardingClient />;
}
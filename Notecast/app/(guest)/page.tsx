"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white overflow-hidden p-2">
      {/* NAVBAR */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">studybuddy</h1>

          <button
            onClick={() =>
              signIn("google", {
                callbackUrl: "/dashboard",
              })
            }
            className="
              bg-white
              text-black
              text-sm
              font-medium
              px-5
              py-2.5
              rounded-full
              hover:bg-zinc-200
              transition
            "
          >
            Start learning
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-10 lg:pt-16">
          <div className="grid lg:grid-cols-[0.85fr_1.15fr] items-center gap-14">
            {/* LEFT */}
            <div className="max-w-[520px]">
              <h1
                className="
                  text-5xl
                  sm:text-6xl
                  lg:text-7xl
                  font-semibold
                  tracking-tight
                  leading-[0.93]
                "
              >
                Study with AI tutors that actually teach.
              </h1>

              <p
                className="
                  mt-6
                  text-lg
                  text-zinc-300
                  leading-relaxed
                  max-w-md
                "
              >
                Upload PDFs, lectures, notes, and videos. Learn through
                conversation and active recall
              </p>

              <button
                onClick={() =>
                  signIn("google", {
                    callbackUrl: "/dashboard",
                  })
                }
                className="
                  mt-10
                  bg-white
                  text-black
                  px-6
                  py-3
                  rounded-full
                  text-sm
                  font-medium
                  hover:bg-zinc-200
                  transition
                "
              >
                Sign in with Google
              </button>
            </div>

            {/* RIGHT */}
            <div className="relative">
              <div
                className="
                  relative
                  rounded-[36px]
                  overflow-hidden
                  border
                  border-white/10
                "
              >
                <div className="relative aspect-[1.18/1]">
                  <Image
                    src="/desk.jpg"
                    alt="Hero"
                    fill
                    priority
                    className="object-cover scale-[1.02]"
                  />

                  {/* CINEMATIC OVERLAY */}
                  <div className="absolute inset-0 bg-black/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

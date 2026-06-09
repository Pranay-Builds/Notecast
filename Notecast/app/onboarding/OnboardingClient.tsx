"use client";

import { useState } from "react";
import Image from "next/image";

const companions = [
  {
    id: "sherlock",
    name: "Sherlock",
    subtitle: "Sherlock Holmes",
    description: "Learns through questions, mysteries and deduction.",
  },
  {
    id: "professor",
    name: "Professor",
    subtitle: "Professor",
    description: "Patient, structured and exam-focused.",
  },
  {
    id: "challenger",
    name: "Challenger",
    subtitle: "Debate Opponent",
    description: "Challenges your thinking and spots weak reasoning.",
  },
];

export default function OnboardingClient() {
  const [step, setStep] = useState(1);
  const [selectedCompanion, setSelectedCompanion] = useState("sherlock");

  return (
    <main className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Header */}
      <header className="h-16 px-6 flex items-center justify-between">
        <span className="text-base font-semibold tracking-tight">curio</span>

        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500">{step}/4</span>

          <div className="w-24 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{
                width: `${(step / 4) * 100}%`,
              }}
            />
          </div>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-3xl">
          {/* STEP 1 */}

          {step === 1 && (
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Welcome to Curio
              </p>

              <h1 className="mt-4 text-5xl md:text-6xl font-semibold tracking-tight leading-[0.95]">
                Studying shouldn't
                <br />
                feel like studying.
              </h1>

              <p className="mt-6 text-lg text-zinc-400 max-w-xl mx-auto">
                Upload your notes. Choose a learning companion. Learn through
                conversation instead of memorization.
              </p>

              <div className="mt-12 max-w-2xl mx-auto">
                <div className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0b0b] shadow-2xl shadow-black/50">
                  {/* Fake Browser Header */}
                  <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />
                    <div className="w-3 h-3 rounded-full bg-zinc-700" />

                    <div className="ml-4 text-xs text-zinc-500">
                      Sherlock • Biology Session
                    </div>
                  </div>

                  {/* Screenshot */}
                  <Image
                    src="/mock_chat.png"
                    alt="Sherlock teaching biology"
                    width={1200}
                    height={1600}
                    priority
                    className="
            w-full
            h-[520px]
            object-cover
            object-top
          "
                  />
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                className="
        mt-10
        bg-white
        text-black
        px-8
        py-3.5
        rounded-full
        font-medium
        hover:bg-zinc-100
        transition-colors
      "
              >
                Continue
              </button>
            </div>
          )}

          {/* STEP 2 */}

          {step === 2 && (
            <div>
              <h1 className="text-4xl font-semibold text-center">
                Who do you want to learn with?
              </h1>

              <div className="grid md:grid-cols-3 gap-4 mt-10">
                {companions.map((companion) => (
                  <button
                    key={companion.id}
                    onClick={() => setSelectedCompanion(companion.id)}
                    className={`text-left p-5 rounded-3xl border transition ${
                      selectedCompanion === companion.id
                        ? "border-white bg-white/10"
                        : "border-white/10"
                    }`}
                  >
                    <h3 className="font-semibold">{companion.name}</h3>

                    <p className="text-sm text-zinc-500 mt-1">
                      {companion.subtitle}
                    </p>

                    <p className="text-sm text-zinc-400 mt-4">
                      {companion.description}
                    </p>
                  </button>
                ))}
              </div>

              <div className="flex justify-center mt-10">
                <button
                  onClick={() => setStep(3)}
                  className="bg-white text-black px-6 py-3 rounded-full font-medium"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}

          {step === 3 && (
            <div className="text-center">
              <h1 className="text-4xl font-semibold">
                Let's teach your companion.
              </h1>

              <p className="mt-3 text-zinc-400">
                Upload notes, PDFs, or YouTube videos.
              </p>

              <div className="grid gap-4 mt-10 max-w-lg mx-auto">
                <button className="border border-white/10 rounded-2xl p-5 text-left">
                  📄 PDF
                </button>

                <button className="border border-white/10 rounded-2xl p-5 text-left">
                  📺 YouTube
                </button>

                <button className="border border-white/10 rounded-2xl p-5 text-left">
                  📝 Paste Notes
                </button>
              </div>

              <div className="mt-8 border border-green-500/20 bg-green-500/10 rounded-2xl p-4 max-w-lg mx-auto text-left">
                <p className="font-medium">✓ Biology Notes.pdf</p>

                <p className="text-sm text-zinc-400 mt-1">23 pages imported</p>
              </div>

              <button
                onClick={() => setStep(4)}
                className="mt-10 bg-white text-black px-6 py-3 rounded-full font-medium"
              >
                Start Session
              </button>
            </div>
          )}

          {/* STEP 4 */}

          {step === 4 && (
            <div className="max-w-2xl mx-auto">
              <div className="border border-white/10 rounded-3xl p-6 bg-white/[0.03]">
                <p className="text-sm text-zinc-500 mb-4">Sherlock</p>

                <div className="space-y-4 text-lg">
                  <p>I've finished reviewing your notes.</p>

                  <p>One thing caught my attention.</p>

                  <p>
                    Most students memorize osmosis, but very few truly
                    understand it.
                  </p>

                  <p>Before we begin...</p>

                  <p>
                    If a red blood cell enters pure water, what do you think
                    happens?
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <input
                  placeholder="Type your answer..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none"
                />

                <button className="bg-white text-black px-5 rounded-xl font-medium">
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

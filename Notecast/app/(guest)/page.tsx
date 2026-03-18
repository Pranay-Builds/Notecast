"use client";
import { signIn } from "next-auth/react";
import Image from "next/image";

const Home = async () => {

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121016] via-[#101010] to-[#101010] flex flex-col gap-8 justify-center items-center px-8">
      <div className="text-center">
        <h1 className="text-4xl font-semibold text-white">Notecast</h1>
        <p className="text-gray-400 mt-3 max-w-md">
          Turn your notes, lectures, and PDFs into AI-generated podcast
          conversations & chat with your notes
        </p>
      </div>

      <button
        className="bg-white text-black font-semibold py-2 px-4 rounded-lg transition hover:bg-gray-100 flex items-center gap-2"
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      >
        Sign in with Google
        <Image src="/google.png" alt="Google" width={18} height={18} />
      </button>

    </div>
  );
};

export default Home;

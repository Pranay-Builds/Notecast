"use client";

import { useEffect, useState } from "react";
import { getShiki } from "@/lib/shiki";
import { Check, Copy } from "lucide-react";

const allowedLangs = ["js", "ts", "jsx", "tsx", "html", "css", "json", "bash"];

export default function CodeBlock({
    code,
    lang = "ts",
}: {
    code: string;
    lang?: string;
}) {
    const [html, setHtml] = useState("");
    const [copied, setCopied] = useState(false);

    const safeLang = allowedLangs.includes(lang) ? lang : "ts";

    useEffect(() => {
        let mounted = true;

        async function highlight() {
            const highlighter = await getShiki();
            const result = highlighter.codeToHtml(code, {
                lang: safeLang,
                theme: "github-dark",
            });

            if (mounted) setHtml(result);
        }

        highlight();

        return () => {
            mounted = false;
        };
    }, [code, safeLang]);

    if (!html) {
        return (
            <div className="bg-[#1e1e1e] rounded-lg p-3 text-zinc-500 text-sm font-mono" >
                Loading code...
            </div>
        );

    }

    return (
        <>
            <div className="bg-[#1e1e1e] rounded-lg overflow-hidden mb-3 border border-zinc-700 relative group" >
                <div className="flex items-center gap-2 px-3 py-2 bg-[#2d2d2d] text-xs text-zinc-400" >
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="ml-2" > {safeLang} </span>
                </div>

                < div
                    className="text-sm font-mono overflow-x-auto [&_pre]:!bg-transparent [&_pre]:p-4"
                    dangerouslySetInnerHTML={{ __html: html }
                    }
                />

                <button
                    onClick={() => {
                        navigator.clipboard.writeText(code);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    }}
                className="
                absolute top-2 right-2
                text-xs px-2 py-1 rounded-md
                bg-zinc-700/80 backdrop-blur
                text-zinc-300 hover:text-white
                opacity-0 group-hover:opacity-100
                transition
                "
                >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
            </div >
        </>
    );
}
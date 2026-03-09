"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Ghost } from "lucide-react";
import Link from "next/link";

type Notebook = {
    id: string;
    name: string;
    description?: string;
};

export default function NotebookPage() {
    const params = useParams();
    const id = params.id;

    const [notebook, setNotebook] = useState<Notebook | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotebook = async () => {
            const res = await fetch(`/api/notebook/${id}`);
            const data = await res.json();

            if (!res.ok) {
                setNotebook(null);
                return;
            }
            console.log(data);
            setNotebook(data.notebook);
            setLoading(false);
        };

        fetchNotebook();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            </div>
        );
    };

    if (!notebook) {
        return (
            <div className="flex flex-col h-screen items-center justify-center gap-4">
                <h1 className="font-semibold text-2xl">Notebook not found</h1>
                <Ghost size={40} className="animate-bounce text-gray-400" />
                <Link href={"/"} className="text-blue-400 hover:underline">go back</Link>
            </div>
        )
    }

    return (
        <div className="p-8 text-white">
            <h1>{notebook.name}</h1>
        </div>
    );
}
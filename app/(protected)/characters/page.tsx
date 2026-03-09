import { Plus } from "lucide-react";


const Characters = () => {
    return (
        <div className="max-w-6xl mx-auto py-12 px-6 text-white">
            <h1 className='text-3xl font-semibold'>Characters</h1>

            <div className="border border-zinc-800 bg-[#181818] rounded-xl p-12 text-center mt-4">
                <h3 className="text-lg font-semibold mb-2">No study buddies yet</h3>
                <p className="text-zinc-400 mb-4">
                    Create your first study buddy to start learning
                </p>

                <button
                    className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                >
                    <Plus size={16} />
                    Create Study Buddy
                </button>
            </div>
        </div>
    )
}

export default Characters;
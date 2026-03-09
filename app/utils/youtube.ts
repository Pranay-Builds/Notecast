
function extractVideoId(url: string): string | null {
    const regex = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}


export async function getVideoInfo(videoUrl: string) {
    try {
        const videoId = extractVideoId(videoUrl);
        if (!videoId) {
            throw new Error("Invalid YouTube URL");
        }
        const response = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`
        );
        if (!response.ok) {
            throw new Error("Failed to fetch video info");
        }
        const data = await response.json();
        return { ...data, url: videoUrl };
    } catch (error) {
        console.error("Error fetching video info:", error);
        throw error;
    }
}
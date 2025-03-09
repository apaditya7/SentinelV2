const API_KEY = "AIzaSyDVEmsiaapnaAYniM0kzO4SNUomqkX7xcQ";

function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
}

async function fetchTranscript(videoId) {
    const url = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${API_KEY}`;
    
    try {
        let response = await fetch(url);
        let data = await response.json();

        if (!data.items || data.items.length === 0) {
            alert("No transcript found for this video.");
            return;
        }

        let transcriptId = data.items[0].id;
        let transcriptUrl = `https://www.googleapis.com/youtube/v3/captions/${transcriptId}?key=${API_KEY}`;
        let transcriptResponse = await fetch(transcriptUrl);
        let transcriptText = await transcriptResponse.text();

        alert("Transcript:\n" + transcriptText);
    } catch (error) {
        console.error("Error fetching transcript:", error);
        alert("Failed to fetch transcript. Check API Key or permissions.");
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getTranscript") {
        let videoId = getVideoId();
        if (videoId) {
            fetchTranscript(videoId);
        } else {
            alert("No video found.");
        }
    }
});

// YouTube Content Script for Sentinel AI
// This script injects functionality into YouTube pages

// Configuration
const API_URL = "http://localhost:5001/transcribe"; // Server1.py YouTube analysis endpoint

// Helper function to get video ID from YouTube URL
function getVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
}

// Function to send transcript to the backend
async function analyzeYouTubeVideo(videoId) {
    try {
        console.log(`🔍 Analyzing YouTube video: ${videoId}`);
        
        // Show loading status in the extension or via a notification
        chrome.runtime.sendMessage({
            action: "showLoading",
            message: "Analyzing video content..."
        });
        
        // Send the video URL to the backend
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                video_url: `https://www.youtube.com/watch?v=${videoId}`
            })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("YouTube analysis response:", data);
        
        // Store the analysis result in chrome.storage for the popup to access
        chrome.storage.local.set({
            "videoAnalysis": data,
            "videoId": videoId,
            "analysisTimestamp": Date.now()
        }, function() {
            console.log("Video analysis stored in local storage");
            
            // Notify popup that analysis is complete
            chrome.runtime.sendMessage({
                action: "analysisComplete",
                videoId: videoId
            });
        });
        
        return data;
    } catch (error) {
        console.error("Error analyzing YouTube video:", error);
        
        // Notify popup of error
        chrome.runtime.sendMessage({
            action: "analysisError",
            error: error.message
        });
        
        return null;
    }
}

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Message received in content script:", request);
    
    if (request.action === "analyzeVideo") {
        let videoId = getVideoId();
        console.log("Current videoId:", videoId);
        
        if (videoId) {
            analyzeYouTubeVideo(videoId)
                .then(result => {
                    if (result) {
                        sendResponse({success: true, data: result});
                    } else {
                        sendResponse({success: false, error: "Failed to analyze video"});
                    }
                })
                .catch(error => {
                    sendResponse({success: false, error: error.message});
                });
            return true; // Keep channel open for async response
        } else {
            sendResponse({success: false, error: "No video found on this page"});
        }
    }
});

// Initialize content script
console.log("Sentinel AI content script loaded on YouTube");
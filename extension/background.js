// Initialize the extension when installed or updated
chrome.runtime.onInstalled.addListener(() => {
    console.log("Sentinel AI Installed!");
    
    // Create context menu item
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "analyze-with-sentinel",
            title: "Analyze with Sentinel AI",
            contexts: ["selection"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Context menu creation error:", chrome.runtime.lastError);
            } else {
                console.log("Context menu item created successfully");
            }
        });
    });
});

// Make sure the context menu is created when the extension starts
chrome.runtime.onStartup.addListener(() => {
    console.log("Sentinel AI Starting...");
    
    // Create context menu item
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "analyze-with-sentinel",
            title: "Analyze with Sentinel AI",
            contexts: ["selection"]
        }, () => {
            if (chrome.runtime.lastError) {
                console.error("Context menu creation error:", chrome.runtime.lastError);
            } else {
                console.log("Context menu item created successfully");
            }
        });
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu clicked:", info.menuItemId);
    
    if (info.menuItemId === "analyze-with-sentinel") {
        if (info.selectionText) {
            console.log("Selected text:", info.selectionText);
            
            // Store the selected text
            chrome.storage.local.set({
                "selectedText": info.selectionText,
                "contextSource": tab.url || "Unknown source"
            }, () => {
                console.log("Text stored in local storage");
                
                // Open popup with the text to analyze
                chrome.windows.create({
                    url: chrome.runtime.getURL("popup.html") + "?action=analyze-text",
                    type: "popup",
                    width: 600,
                    height: 600
                }, (window) => {
                    if (chrome.runtime.lastError) {
                        console.error("Window creation error:", chrome.runtime.lastError);
                    } else {
                        console.log("Popup window created:", window.id);
                    }
                });
            });
        }
    }
});
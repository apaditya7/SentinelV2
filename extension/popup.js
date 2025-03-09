// Sentinel AI Popup JavaScript
// Updated to work with Python backends

// API endpoints
const TEXT_ANALYSIS_API = "http://localhost:5002/check"; // Server2.py text analysis endpoint
const SINGLE_CLAIM_API = "http://localhost:5002/check-single"; // Server2.py single claim endpoint
const YOUTUBE_API = "http://localhost:5001/transcribe"; // Server1.py YouTube analysis endpoint

document.addEventListener('DOMContentLoaded', function() {
    // Force popup width using JavaScript as a backup method
    document.body.style.width = '600px';
    document.body.style.minWidth = '600px';
    document.querySelector('.container').style.width = '600px';
    
    // Check for context menu selected text
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'analyze-text') {
        // Switch to the text verifier tab
        switchToTab('text-verifier');
        
        // Load the selected text from storage
        chrome.storage.local.get(['selectedText', 'contextSource'], function(result) {
            if (result.selectedText) {
                document.getElementById('text-input').value = result.selectedText;
                
                // Auto-analyze the text
                setTimeout(() => {
                    document.getElementById('verify-text').click();
                }, 500);
            }
        });
    }
    
    // Tab Navigation
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        switchToTab(target);
      });
    });
    
    function switchToTab(tabId) {
        // Hide all tab contents and deactivate tabs
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        
        tabs.forEach(t => {
          t.classList.remove('active');
        });
        
        // Activate selected tab and content
        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }
    
    // YouTube Checker
    const getTranscriptBtn = document.getElementById('getTranscript');
    getTranscriptBtn.addEventListener('click', function() {
      const youtubeUrl = document.getElementById('youtube-url').value.trim();
      
      // Show loading screen
      document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
      });
      document.getElementById('loading-section').style.display = 'flex';
      document.querySelector('.loading-text').textContent = "Analyzing YouTube content...";
      
      if (youtubeUrl) {
        // Extract video ID from URL
        const videoId = extractVideoId(youtubeUrl);
        if (videoId) {
          // Direct API call without using content script
          analyzeYouTubeVideoDirectly(videoId, youtubeUrl);
        } else {
          showError("Invalid YouTube URL");
        }
      } else {
        // Get current tab URL
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          if (!tabs || tabs.length === 0) {
            showError("Could not access current tab");
            return;
          }
          
          const currentTab = tabs[0];
          if (currentTab && currentTab.url && currentTab.url.includes("youtube.com/watch")) {
            // Get the video ID from the URL
            const videoId = extractVideoId(currentTab.url);
            if (videoId) {
              // Make direct API call
              analyzeYouTubeVideoDirectly(videoId, currentTab.url);
            } else {
              showError("Could not extract video ID from current tab");
            }
          } else {
            showError("Current tab is not a YouTube video");
          }
        });
      }
    });
    
    // Extract video ID from YouTube URL
    function extractVideoId(url) {
      const pattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
      const match = url.match(pattern);
      return match ? match[1] : null;
    }
    
    // Direct API call for YouTube analysis
    async function analyzeYouTubeVideoDirectly(videoId, videoUrl) {
      console.log(`Directly analyzing YouTube video: ${videoId}`);
      
      try {
        // Make API request
        const response = await fetch(YOUTUBE_API, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            video_url: videoUrl || `https://www.youtube.com/watch?v=${videoId}`
          })
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("YouTube analysis response:", data);
        
        // Store the analysis result
        chrome.storage.local.set({
          "videoAnalysis": data,
          "videoId": videoId,
          "analysisTimestamp": Date.now()
        });
        
        // Display results
        displayVideoAnalysisResults(data);
      } catch (error) {
        console.error("Error in direct YouTube analysis:", error);
        showError(`Failed to analyze video: ${error.message}`);
      }
    }
    
    // Display video analysis results
    function displayVideoAnalysisResults(data) {
      document.getElementById('loading-section').style.display = 'none';
      
      // Set up the results with the data from the backend
      const trustScore = data.video_info.trust_score || 5.0;
      showResultsSection(trustScore);
      
      // Update summary and other elements with actual data
      document.getElementById('summary').textContent = data.analysis_summary.recommendation || 
        "Analysis complete. Review the claims below for detailed information.";
      
      // Clear existing report content
      const reportElement = document.getElementById('report');
      reportElement.innerHTML = '';
      
      // Add each verified claim to the report
      data.verified_claims.forEach(claim => {
        const resultClass = getResultClass(claim.result);
        const resultIcon = getResultIcon(claim.result);
        
        const claimItem = document.createElement('div');
        claimItem.className = `fact-item ${resultClass}`;
        
        claimItem.innerHTML = `
          <div class="fact-icon"><i class="fas ${resultIcon}"></i></div>
          <div class="fact-content">
            <p class="fact-claim">${claim.claim}</p>
            <p class="fact-verification">${claim.result}: ${claim.summary}</p>
            ${claim.detailed_analysis ? `<p class="fact-detailed-analysis">${claim.detailed_analysis}</p>` : ''}
          </div>
        `;
        
        reportElement.appendChild(claimItem);
      });
      
      // Update sources list
      const sourcesList = document.getElementById('sources-list');
      sourcesList.innerHTML = '';
      
      // Collect unique sources from all claims
      const uniqueSources = new Map();
      data.verified_claims.forEach(claim => {
        if (claim.sources && Array.isArray(claim.sources)) {
          claim.sources.forEach(source => {
            if (source.name && source.url) {
              uniqueSources.set(source.url, source.name);
            }
          });
        }
      });
      
      // Add sources to the list
      uniqueSources.forEach((name, url) => {
        const sourceItem = document.createElement('li');
        sourceItem.innerHTML = `<a href="${url}" target="_blank">${name}</a>`;
        sourcesList.appendChild(sourceItem);
      });
      
      document.getElementById('results-section').style.display = 'flex';
    }
    
    // Get CSS class based on result
    function getResultClass(result) {
      switch (result) {
        case 'TRUE': return 'true';
        case 'FALSE': return 'false';
        default: return 'partial';
      }
    }
    
    // Get icon based on result
    function getResultIcon(result) {
      switch (result) {
        case 'TRUE': return 'fa-check-circle';
        case 'FALSE': return 'fa-times-circle';
        default: return 'fa-exclamation-circle';
      }
    }
    
    // Deepfake Detection
    const uploadArea = document.getElementById('upload-area');
    const fileUpload = document.getElementById('file-upload');
    
    uploadArea.addEventListener('click', () => {
      fileUpload.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = 'rgba(0, 188, 212, 0.15)';
      uploadArea.style.borderStyle = 'solid';
    });
    
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.style.backgroundColor = 'rgba(0, 188, 212, 0.05)';
      uploadArea.style.borderStyle = 'dashed';
    });
    
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.style.backgroundColor = 'rgba(0, 188, 212, 0.05)';
      uploadArea.style.borderStyle = 'dashed';
      
      if (e.dataTransfer.files.length) {
        fileUpload.files = e.dataTransfer.files;
        handleFileUpload(e.dataTransfer.files[0]);
      }
    });
    
    fileUpload.addEventListener('change', () => {
      if (fileUpload.files.length) {
        handleFileUpload(fileUpload.files[0]);
      }
    });
    
    function handleFileUpload(file) {
      // Show file name
      const fileName = file.name;
      uploadArea.innerHTML = `
        <i class="fas fa-file-image"></i>
        <p>${fileName}</p>
      `;
      
      // Enable analyze button
      document.getElementById('analyze-media').disabled = false;
    }
    
    const analyzeMediaBtn = document.getElementById('analyze-media');
    analyzeMediaBtn.addEventListener('click', function() {
      // Show loading screen
      document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
      });
      document.getElementById('loading-section').style.display = 'flex';
      
      // For now, we'll use simulated results
      // This would be integrated with a deepfake detection API in the future
      setTimeout(() => {
        document.getElementById('loading-section').style.display = 'none';
        showResultsSection(6.5);
      }, 2500);
    });
    
    // Text Verification - Updated to use backend API
    const verifyTextBtn = document.getElementById('verify-text');
    verifyTextBtn.addEventListener('click', function() {
      const text = document.getElementById('text-input').value.trim();
      
      if (text.length === 0) {
        // Show error if no text
        document.getElementById('text-input').style.borderColor = '#c62828';
        setTimeout(() => {
          document.getElementById('text-input').style.borderColor = 'var(--border-color)';
        }, 1500);
        return;
      }
      
      // Show loading screen
      document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
      });
      document.getElementById('loading-section').style.display = 'flex';
      document.querySelector('.loading-text').textContent = "Analyzing text for factual claims...";
      
      // Call backend API to verify text
      verifyTextWithAPI(text);
    });
    
    // Function to call the text verification API
    async function verifyTextWithAPI(text) {
      try {
        // Determine which API to use based on text length
        const apiEndpoint = text.split(' ').length < 20 ? SINGLE_CLAIM_API : TEXT_ANALYSIS_API;
        const requestBody = text.split(' ').length < 20 ? { claim: text } : { text: text };
        
        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Handle single claim response differently than multi-claim
        if (apiEndpoint === SINGLE_CLAIM_API) {
          // Convert single claim response to match format of multi-claim
          const formattedData = {
            verified_claims: [data],
            analysis_summary: {
              total_claims: 1,
              verified_true: data.result === 'TRUE' ? 1 : 0,
              verified_false: data.result === 'FALSE' ? 1 : 0,
              unverified: data.result === 'UNVERIFIED' ? 1 : 0,
              trust_score: data.result === 'TRUE' ? 10.0 : (data.result === 'FALSE' ? 0.0 : 5.0),
              recommendation: getSingleClaimRecommendation(data.result),
              original_text: text
            }
          };
          displayTextAnalysisResults(formattedData);
        } else {
          // Multi-claim response handling
          displayTextAnalysisResults(data);
        }
      } catch (error) {
        console.error("Error verifying text:", error);
        showError("Failed to verify text: " + error.message);
      }
    }
    
    // Get recommendation for single claim
    function getSingleClaimRecommendation(result) {
      switch (result) {
        case 'TRUE':
          return "This claim appears to be factually accurate.";
        case 'FALSE':
          return "This claim appears to be false or misleading.";
        default:
          return "This claim could not be verified with available information.";
      }
    }
    
    // Display text analysis results
    function displayTextAnalysisResults(data) {
      document.getElementById('loading-section').style.display = 'none';
      
      // Set up the results with the data from the backend
      const trustScore = data.analysis_summary.trust_score || 5.0;
      showResultsSection(trustScore);
      
      // Update summary with recommendation
      document.getElementById('summary').textContent = data.analysis_summary.recommendation || 
        "Analysis complete. Review the claims below for detailed information.";
      
      // Clear existing report content
      const reportElement = document.getElementById('report');
      reportElement.innerHTML = '';
      
      // Add each verified claim to the report
      data.verified_claims.forEach(claim => {
        const resultClass = getResultClass(claim.result);
        const resultIcon = getResultIcon(claim.result);
        
        const claimItem = document.createElement('div');
        claimItem.className = `fact-item ${resultClass}`;
        
        let detailedAnalysis = '';
        if (claim.detailed_analysis) {
          detailedAnalysis = `<p class="fact-detailed-analysis">${claim.detailed_analysis}</p>`;
        }
        
        let additionalContext = '';
        if (claim.additional_context) {
          additionalContext = `<p class="fact-additional-context"><strong>Context:</strong> ${claim.additional_context}</p>`;
        }
        
        claimItem.innerHTML = `
          <div class="fact-icon"><i class="fas ${resultIcon}"></i></div>
          <div class="fact-content">
            <p class="fact-claim">${claim.claim}</p>
            <p class="fact-verification"><strong>${claim.result}:</strong> ${claim.summary}</p>
            ${detailedAnalysis}
            ${additionalContext}
          </div>
        `;
        
        reportElement.appendChild(claimItem);
      });
      
      // Update sources list
      const sourcesList = document.getElementById('sources-list');
      sourcesList.innerHTML = '';
      
      // Collect unique sources from all claims
      const uniqueSources = new Map();
      data.verified_claims.forEach(claim => {
        if (claim.sources && Array.isArray(claim.sources)) {
          claim.sources.forEach(source => {
            if (source.name && source.url) {
              uniqueSources.set(source.url, source.name);
            }
          });
        }
        
        // Also check source_links and source_names arrays
        if (claim.source_links && claim.source_names && 
            Array.isArray(claim.source_links) && Array.isArray(claim.source_names)) {
          for (let i = 0; i < Math.min(claim.source_links.length, claim.source_names.length); i++) {
            uniqueSources.set(claim.source_links[i], claim.source_names[i]);
          }
        }
      });
      
      // Add sources to the list
      uniqueSources.forEach((name, url) => {
        const sourceItem = document.createElement('li');
        sourceItem.innerHTML = `<a href="${url}" target="_blank">${name}</a>`;
        sourcesList.appendChild(sourceItem);
      });
      
      document.getElementById('results-section').style.display = 'flex';
    }
    
    // Show error
    function showError(message) {
      document.getElementById('loading-section').style.display = 'none';
      
      // Show results section with error message
      document.getElementById('results-section').style.display = 'flex';
      document.getElementById('summary').textContent = message;
      document.getElementById('report').innerHTML = `
        <div class="fact-item false">
          <div class="fact-icon"><i class="fas fa-exclamation-triangle"></i></div>
          <div class="fact-content">
            <p class="fact-claim">An error occurred during analysis</p>
            <p class="fact-verification">${message}</p>
          </div>
        </div>
      `;
      
      // Set score to indicate error
      showResultsSection(0);
    }
    
    // Back button in results
    const backButton = document.getElementById('back-button');
    backButton.addEventListener('click', function() {
      document.getElementById('results-section').style.display = 'none';
      
      // Show the active tab content
      const activeTab = document.querySelector('.tab.active').dataset.tab;
      document.getElementById(activeTab).style.display = 'flex';
    });
    
    // Share/Download button
    const shareButton = document.getElementById('share-button');
    shareButton.addEventListener('click', function() {
      // Get current results and format them for download
      chrome.storage.local.get(["videoAnalysis"], function(result) {
        let downloadData;
        
        if (result.videoAnalysis) {
          downloadData = result.videoAnalysis;
        } else {
          // Create data from what's currently displayed
          downloadData = {
            title: "Sentinel AI Analysis Report",
            timestamp: new Date().toISOString(),
            summary: document.getElementById('summary').textContent,
            claims: []
          };
          
          // Extract claims from report
          const claimElements = document.querySelectorAll('.fact-item');
          claimElements.forEach(el => {
            const claimText = el.querySelector('.fact-claim').textContent;
            const verificationText = el.querySelector('.fact-verification').textContent;
            
            downloadData.claims.push({
              claim: claimText,
              verification: verificationText
            });
          });
        }
        
        // Convert to JSON and create download link
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(downloadData, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "sentinel-ai-report.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
      });
    });
    
    // Keyboard support for text input
    document.getElementById('text-input').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && e.ctrlKey) {
        verifyTextBtn.click();
      }
    });
    
    // History item clicks
    const historyItems = document.querySelectorAll('.history-item');
    historyItems.forEach(item => {
      item.addEventListener('click', function() {
        // Show loading screen
        document.querySelectorAll('.tab-content').forEach(el => {
          el.style.display = 'none';
        });
        document.getElementById('loading-section').style.display = 'flex';
        
        // Get score from history item
        const scoreEl = item.querySelector('.history-score');
        const score = parseFloat(scoreEl.textContent);
        
        // Simulate API call with timeout
        setTimeout(() => {
          document.getElementById('loading-section').style.display = 'none';
          showResultsSection(score);
        }, 1500);
      });
    });
    
    // Function to show results with appropriate styling based on score
    function showResultsSection(score) {
      document.getElementById('results-section').style.display = 'flex';
      
      // Update the misinformation score
      const scoreLabel = document.getElementById('score-label');
      const scoreBadge = document.getElementById('score-badge');
      const scoreDescription = document.getElementById('score-description');
      const owlWisdom = document.getElementById('owl-wisdom');
      
      scoreLabel.innerText = `${score.toFixed(1)}/10`;
      
      // Calculate the wisdom glasses length based on score (0-10)
      // At 0, minimal extension, at 10, maximum extension
      const maxWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--owl-glasses-max-width')) || 200;
      const wisdomWidth = Math.max(5, Math.round((score / 10) * maxWidth));
      
      // Animate the glasses extension
      setTimeout(() => {
        owlWisdom.style.width = `${wisdomWidth}px`;
      }, 300);
      
      // Set colors and label based on the score
      let bgColor, textColor, borderColor, icon, description;
      
      if (score <= 3.3) {
        // Low misinformation - generally reliable
        bgColor = 'rgba(46, 125, 50, 0.1)';
        textColor = '#2e7d32';
        borderColor = '#2e7d32';
        icon = '✓';
        description = 'Generally Reliable';
        
        // Update owl to look happy (adjust eyebrows)
        document.querySelectorAll('.owl-eyebrow').forEach(eyebrow => {
          if (eyebrow.classList.contains('left')) {
            eyebrow.style.transform = 'rotate(-10deg)';
          } else {
            eyebrow.style.transform = 'rotate(10deg)';
          }
        });
        
      } else if (score <= 6.6) {
        // Medium misinformation - be cautious
        bgColor = 'rgba(255, 143, 0, 0.1)';
        textColor = '#ff8f00';
        borderColor = '#ff8f00';
        icon = '⚠';
        description = 'Some Misleading Content';
        
        // Update owl to look concerned (neutral eyebrows)
        document.querySelectorAll('.owl-eyebrow').forEach(eyebrow => {
          if (eyebrow.classList.contains('left')) {
            eyebrow.style.transform = 'rotate(-20deg)';
          } else {
            eyebrow.style.transform = 'rotate(20deg)';
          }
        });
        
      } else {
        // High misinformation - unreliable
        bgColor = 'rgba(198, 40, 40, 0.1)';
        textColor = '#c62828';
        borderColor = '#c62828';
        icon = '✗';
        description = 'Highly Misleading';
        
        // Update owl to look suspicious (furrowed eyebrows)
        document.querySelectorAll('.owl-eyebrow').forEach(eyebrow => {
          if (eyebrow.classList.contains('left')) {
            eyebrow.style.transform = 'rotate(-30deg)';
          } else {
            eyebrow.style.transform = 'rotate(30deg)';
          }
        });
      }
      
      // Apply styles
      scoreLabel.style.color = textColor;
      
      if (scoreBadge) {
        scoreBadge.innerHTML = icon;
        scoreBadge.style.backgroundColor = bgColor;
        scoreBadge.style.color = textColor;
        scoreBadge.style.borderColor = borderColor;
      }
      
      if (scoreDescription) {
        scoreDescription.textContent = description;
        scoreDescription.style.color = textColor;
      }
      
      // Update the score container border color
      const scoreContainer = document.querySelector('.score-container');
      if (scoreContainer) {
        scoreContainer.style.borderColor = borderColor;
        scoreContainer.style.backgroundColor = bgColor;
      }
      
      // Also update the owl wisdom color to match
      owlWisdom.style.background = `linear-gradient(90deg, ${textColor}, ${textColor})`;
    }
    
    // Settings link
    document.getElementById('settings-link').addEventListener('click', function(e) {
      e.preventDefault();
      alert("Settings would open here!");
    });
  
    // Log to see if script is executing
    console.log("Sentinel AI Script loaded successfully");
    console.log("Width applied:", document.body.style.width);
  });
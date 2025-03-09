// Sentinel AI Popup JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Force popup width using JavaScript as a backup method
    document.body.style.width = '600px';
    document.body.style.minWidth = '600px';
    document.querySelector('.container').style.width = '600px';
    
    // Tab Navigation
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        
        // Hide all tab contents and deactivate tabs
        tabContents.forEach(content => {
          content.classList.remove('active');
        });
        
        tabs.forEach(t => {
          t.classList.remove('active');
        });
        
        // Activate selected tab and content
        tab.classList.add('active');
        document.getElementById(target).classList.add('active');
      });
    });
    
    // YouTube Checker
    const getTranscriptBtn = document.getElementById('getTranscript');
    getTranscriptBtn.addEventListener('click', function() {
      const youtubeUrl = document.getElementById('youtube-url').value.trim();
      
      // Show loading screen
      document.querySelectorAll('.tab-content').forEach(el => {
        el.style.display = 'none';
      });
      document.getElementById('loading-section').style.display = 'flex';
      
      // Simulate API call with timeout
      setTimeout(() => {
        document.getElementById('loading-section').style.display = 'none';
        showResultsSection(7.8); // Show results with a score of 7.8 (high misinformation)
      }, 2000);
    });
    
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
      
      // Simulate API call with timeout
      setTimeout(() => {
        document.getElementById('loading-section').style.display = 'none';
        showResultsSection(6.5); // Show results with a score of 6.5 (medium/high misinformation)
      }, 2500);
    });
    
    // Text Verification
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
      
      // Simulate API call with timeout
      setTimeout(() => {
        document.getElementById('loading-section').style.display = 'none';
        showResultsSection(4.2); // Show results with a score of 4.2 (medium misinformation)
      }, 1800);
    });
    
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
      // Simulate download
      alert("Report downloaded successfully!");
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
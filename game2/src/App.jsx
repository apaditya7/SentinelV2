import React, { useState, useEffect } from 'react';
import { Clock, Search, AlertCircle, CheckCircle, X, ExternalLink, Shield, Award, BarChart2, HelpCircle, RefreshCw, Clipboard, Trash2, Filter, ArrowRight } from 'lucide-react';

const App = () => {
  // Game states
  const [gameActive, setGameActive] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(180);
  const [reputation, setReputation] = useState(100);
  const [inbox, setInbox] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [currentClaimIndex, setCurrentClaimIndex] = useState(null);
  const [sources, setSources] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);
  const [verification, setVerification] = useState(null);
  const [stage, setStage] = useState('inbox'); // inbox, research, publish
  const [feedback, setFeedback] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [stats, setStats] = useState({
    accurate: 0,
    misleading: 0,
    fast: 0,
    thorough: 0
  });

  // Claim database
  const claimDatabase = [
    {
      id: 1,
      headline: "New Study: Chocolate Cures Common Cold",
      submitter: "Health News Daily",
      urgency: "high",
      category: "health",
      factStatus: "false",
      details: "A recently published study claims that eating 100g of dark chocolate daily eliminates cold symptoms within 24 hours.",
      sources: [
        { id: 1, name: "Journal of Alternative Healing", reliability: "low", info: "Published the original study with only 15 participants and no control group.", relevance: "high" },
        { id: 2, name: "National Health Institute", reliability: "high", info: "Has no records of chocolate having significant impact on cold symptoms.", relevance: "high" },
        { id: 3, name: "Dr. Smith's Blog", reliability: "medium", info: "Mentions the study but notes limitations and calls for more research.", relevance: "medium" },
        { id: 4, name: "Chocolate Industry Association", reliability: "low", info: "Promotes the findings without mentioning study limitations.", relevance: "medium" }
      ],
      correctAssessment: "false",
      explanation: "The study has significant methodological flaws, a very small sample size, and conflicts with established medical research. While chocolate has some antioxidant properties, there's no evidence it can cure colds."
    },
    {
      id: 2,
      headline: "City Mayor Announces Free Public Transport Next Month",
      submitter: "Local News Network",
      urgency: "medium",
      category: "politics",
      factStatus: "mostly-true",
      details: "Mayor Johnson announced that all public transport will be free for residents during the next month as part of a sustainability initiative.",
      sources: [
        { id: 1, name: "City Council Website", reliability: "high", info: "Official press release confirms free transport but only on weekdays.", relevance: "high" },
        { id: 2, name: "Mayor's Twitter Account", reliability: "high", info: "Tweet announcing the initiative with details matching the press release.", relevance: "high" },
        { id: 3, name: "Transport Workers Union", reliability: "medium", info: "Statement supporting the initiative but noting it's a pilot program.", relevance: "medium" },
        { id: 4, name: "Opposition Party Statement", reliability: "medium", info: "Claims the program is underfunded and won't last a full month.", relevance: "low" }
      ],
      correctAssessment: "mostly-true",
      explanation: "The core claim is accurate, but requires clarification that the free service is only on weekdays and is a pilot program rather than a permanent change."
    },
    {
      id: 3,
      headline: "5G Towers Causing Unusual Bird Deaths in the Region",
      submitter: "Environmental Watch",
      urgency: "high",
      category: "technology",
      factStatus: "false",
      details: "Multiple reports of birds dying near newly installed 5G towers suggest radiation might be affecting local wildlife.",
      sources: [
        { id: 1, name: "Local Birdwatching Group", reliability: "medium", info: "Noted seasonal migration patterns can explain changes in bird populations.", relevance: "high" },
        { id: 2, name: "University Research Department", reliability: "high", info: "No scientific evidence that 5G radiation affects birds at current levels.", relevance: "high" },
        { id: 3, name: "Anti-5G Activist Website", reliability: "low", info: "Collection of anecdotal reports without verification or scientific controls.", relevance: "medium" },
        { id: 4, name: "Telecommunications Regulatory Body", reliability: "high", info: "Statement that 5G frequencies are well below levels that could harm wildlife.", relevance: "high" }
      ],
      correctAssessment: "false",
      explanation: "There is no scientific evidence linking 5G towers to bird deaths. The claim relies on coincidental timing and anecdotal reports rather than controlled studies."
    },
    {
      id: 4,
      headline: "Famous Actor Donates $1 Million to Local Hospital",
      submitter: "Celebrity News Now",
      urgency: "low",
      category: "entertainment",
      factStatus: "true",
      details: "Award-winning actor James Reynolds has donated $1 million to the children's wing of Metro General Hospital.",
      sources: [
        { id: 1, name: "Hospital Press Release", reliability: "high", info: "Confirms the donation amount and expresses gratitude to Reynolds.", relevance: "high" },
        { id: 2, name: "Actor's Official Instagram", reliability: "high", info: "Post showing Reynolds at the hospital with staff and mentioning the donation.", relevance: "high" },
        { id: 3, name: "Local Newspaper", reliability: "high", info: "Article with quotes from hospital director confirming the donation.", relevance: "medium" },
        { id: 4, name: "Celebrity Gossip Blog", reliability: "low", info: "Claims the donation is a publicity stunt for Reynolds' upcoming movie.", relevance: "low" }
      ],
      correctAssessment: "true",
      explanation: "Multiple reliable sources confirm the donation has been made. The actor's motives are speculative and not relevant to the factual accuracy of the donation itself."
    },
    {
      id: 5,
      headline: "Scientists Discover Huge Asteroid Heading Toward Earth",
      submitter: "Science Daily",
      urgency: "high",
      category: "science",
      factStatus: "false",
      details: "Astronomers have identified a large asteroid that will pass dangerously close to Earth next month, potentially causing catastrophic damage.",
      sources: [
        { id: 1, name: "NASA Website", reliability: "high", info: "No mention of any dangerous asteroids in the near future.", relevance: "high" },
        { id: 2, name: "Astronomy Professor Blog", reliability: "medium", info: "Discusses a newly discovered asteroid but confirms it will pass safely, millions of miles from Earth.", relevance: "high" },
        { id: 3, name: "Doomsday Preparation Forum", reliability: "low", info: "Users claiming inside information about a government cover-up of the asteroid threat.", relevance: "low" },
        { id: 4, name: "International Astronomical Union", reliability: "high", info: "Official statement that no asteroids pose a threat to Earth in the foreseeable future.", relevance: "high" }
      ],
      correctAssessment: "false",
      explanation: "This claim is false. While a new asteroid may have been discovered, authoritative sources in astronomy confirm it poses no threat to Earth."
    },
    {
      id: 6,
      headline: "New Law Requires Microchips for All Pets Starting Next Year",
      submitter: "Pet Lovers Magazine",
      urgency: "medium",
      category: "legislation",
      factStatus: "mostly-true",
      details: "A new state law will require all dog and cat owners to have their pets microchipped by January 1st or face fines.",
      sources: [
        { id: 1, name: "State Legislature Website", reliability: "high", info: "Bill was passed requiring microchipping but only applies to newly adopted pets from shelters.", relevance: "high" },
        { id: 2, name: "Animal Control Department", reliability: "high", info: "Confirms the new requirement but notes existing pets are grandfathered in.", relevance: "high" },
        { id: 3, name: "Local News Report", reliability: "medium", info: "Covers the new law but doesn't clarify that it only applies to shelter adoptions.", relevance: "medium" },
        { id: 4, name: "Veterinarian Association", reliability: "high", info: "Statement supporting the law and offering discounted microchipping for pet owners.", relevance: "medium" }
      ],
      correctAssessment: "mostly-true",
      explanation: "While a microchipping law was passed, it only applies to newly adopted pets from shelters, not all pets as the headline suggests."
    },
    {
      id: 7,
      headline: "Drinking Lemon Water in the Morning Boosts Metabolism by 30%",
      submitter: "Wellness Today",
      urgency: "low",
      category: "health",
      factStatus: "false",
      details: "Health experts say that drinking warm lemon water first thing in the morning can increase your metabolism by up to 30%, helping with weight loss.",
      sources: [
        { id: 1, name: "Journal of Nutrition", reliability: "high", info: "No studies showing significant metabolic impact from lemon water consumption.", relevance: "high" },
        { id: 2, name: "Celebrity Fitness Guru", reliability: "low", info: "Claims personal clients lost weight using this method, but provides no scientific evidence.", relevance: "medium" },
        { id: 3, name: "Registered Dietitian Interview", reliability: "high", info: "States that while hydration is important, lemon water has minimal effect on metabolism.", relevance: "high" },
        { id: 4, name: "Citrus Growers Association", reliability: "low", info: "Promotional materials claiming multiple health benefits of lemons without scientific backing.", relevance: "medium" }
      ],
      correctAssessment: "false",
      explanation: "There is no scientific evidence that lemon water significantly affects metabolism. Any weight loss effects are likely due to increased hydration or replacing higher-calorie beverages."
    },
    {
      id: 8,
      headline: "Local School Implements Four-Day Week Starting Fall Semester",
      submitter: "Education News Network",
      urgency: "medium",
      category: "education",
      factStatus: "true",
      details: "Washington High School has announced it will switch to a four-day school week with longer daily hours beginning this fall.",
      sources: [
        { id: 1, name: "School District Website", reliability: "high", info: "Official announcement of the schedule change with implementation details.", relevance: "high" },
        { id: 2, name: "School Board Meeting Minutes", reliability: "high", info: "Recorded vote approving the change after a six-month study.", relevance: "high" },
        { id: 3, name: "Parent-Teacher Association", reliability: "medium", info: "Statement acknowledging the change and outlining parent concerns and benefits.", relevance: "medium" },
        { id: 4, name: "Student Newspaper", reliability: "medium", info: "Interviews with administrators confirming the four-day schedule.", relevance: "medium" }
      ],
      correctAssessment: "true",
      explanation: "Multiple official sources confirm the schedule change. The information is accurately reported and verified."
    }
  ];
  
  // Available source types for research - Not used in current version but kept for future expansion
  // const availableSources = [
  //   { category: "Official", sources: ["Government Websites", "Press Releases", "Official Statements", "Court Documents"] },
  //   { category: "News", sources: ["Major News Networks", "Local Newspapers", "News Wire Services", "Investigative Journalists"] },
  //   { category: "Academic", sources: ["Scientific Journals", "University Research", "Academic Databases", "Expert Interviews"] },
  //   { category: "Social", sources: ["Social Media Posts", "Forums", "Blogs", "User Comments"] },
  //   { category: "Reference", sources: ["Historical Archives", "Statistical Databases", "Public Records", "Industry Reports"] }
  // ];

  // Game initialization
  const startGame = () => {
    setGameActive(true);
    setGameOver(false);
    setScore(0);
    setTimeLeft(180);
    setReputation(100);
    setStage('inbox');
    generateInbox();
    setCheckedItems([]);
    setStats({
      accurate: 0,
      misleading: 0,
      fast: 0,
      thorough: 0
    });
  };
  
  const endGame = () => {
    setGameActive(false);
    setGameOver(true);
  };
  
  // Generate new inbox of claims to fact-check
  const generateInbox = () => {
    const shuffled = [...claimDatabase].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 5);
    setInbox(selected.map(claim => ({
      ...claim,
      timeReceived: new Date().getTime(),
      status: 'new'
    })));
  };
  
  // Select claim to start researching
  const selectClaimToResearch = (index) => {
    setCurrentClaimIndex(index);
    setStage('research');
    setSelectedSources([]);
    setVerification(null);
    
    // Generate available sources for this claim
    const currentClaim = inbox[index];
    setSources(currentClaim.sources);
  };
  
  // Select a source to use in research
  const toggleSource = (sourceId) => {
    if (selectedSources.includes(sourceId)) {
      setSelectedSources(selectedSources.filter(id => id !== sourceId));
    } else {
      setSelectedSources([...selectedSources, sourceId]);
    }
  };
  
  // Submit verification assessment
  const submitVerification = (assessment) => {
    setVerification(assessment);
    setStage('publish');
  };
  
  // Publish the fact check
  const publishFactCheck = () => {
    const currentClaim = inbox[currentClaimIndex];
    let newScore = score;
    let reputationChange = 0;
    let feedbackMessage = "";
    let isCorrect = false;
    
    // Calculate accuracy
    if (verification === currentClaim.correctAssessment) {
      isCorrect = true;
      newScore += 100;
      reputationChange += 5;
      feedbackMessage = "Correct assessment! ";
      setStats(prev => ({...prev, accurate: prev.accurate + 1}));
    } else {
      newScore -= 50;
      reputationChange -= 10;
      feedbackMessage = "Your assessment was inaccurate. ";
      setStats(prev => ({...prev, misleading: prev.misleading + 1}));
    }
    
    // Calculate thoroughness
    const thoroughness = selectedSources.length / sources.length;
    if (thoroughness > 0.75) {
      newScore += 50;
      reputationChange += 2;
      feedbackMessage += "Your research was very thorough. ";
      setStats(prev => ({...prev, thorough: prev.thorough + 1}));
    } else if (thoroughness < 0.5) {
      newScore -= 25;
      reputationChange -= 5;
      feedbackMessage += "Your research lacked thoroughness. ";
    }
    
    // Calculate speed (under 30 seconds is fast)
    const timeSpent = 30; // In a real game, this would be tracked
    if (timeSpent < 30) {
      newScore += 25;
      feedbackMessage += "You completed this fact-check quickly. ";
      setStats(prev => ({...prev, fast: prev.fast + 1}));
    }
    
    // Update game state
    setScore(newScore);
    setReputation(Math.max(0, Math.min(100, reputation + reputationChange)));
    setFeedback({
      message: feedbackMessage,
      explanation: currentClaim.explanation,
      isCorrect
    });
    
    // Mark claim as checked
    const updatedInbox = [...inbox];
    updatedInbox[currentClaimIndex].status = 'checked';
    setInbox(updatedInbox);
    
    // Add to checked items
    setCheckedItems([...checkedItems, {
      ...currentClaim,
      userAssessment: verification,
      sourcesUsed: selectedSources.length,
      isCorrect
    }]);
    
    // Return to inbox after a delay
    setTimeout(() => {
      setStage('inbox');
      setFeedback(null);
      
      // If all items are checked, generate new inbox
      if (updatedInbox.every(item => item.status === 'checked')) {
        generateInbox();
      }
    }, 5000);
  };
  
  // Skip current claim
  const skipClaim = () => {
    const updatedInbox = [...inbox];
    updatedInbox[currentClaimIndex].status = 'skipped';
    setInbox(updatedInbox);
    setReputation(Math.max(0, reputation - 2));
    setStage('inbox');
  };
  
  // Timer effect
  useEffect(() => {
    let timer;
    if (gameActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      endGame();
    }
    
    return () => clearInterval(timer);
  }, [gameActive, timeLeft]);
  
  // Tutorial navigation
  const nextTutorialStep = () => {
    if (tutorialStep < 5) {
      setTutorialStep(tutorialStep + 1);
    } else {
      setShowTutorial(false);
      setTutorialStep(1);
    }
  };
  
  // Rendering functions
  const renderInbox = () => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Your Fact-Checking Inbox</h2>
        
        {inbox.length === 0 ? (
          <div className="text-center p-8 text-gray-500">
            Your inbox is empty! Great job.
          </div>
        ) : (
          <div className="space-y-2">
            {inbox.map((claim, index) => (
              <div 
                key={claim.id}
                className={`p-4 border rounded-lg cursor-pointer transition hover:bg-gray-50 ${
                  claim.status === 'checked' ? 'border-green-200 bg-green-50' : 
                  claim.status === 'skipped' ? 'border-gray-200 bg-gray-50 opacity-60' : 
                  claim.urgency === 'high' ? 'border-red-200' : 
                  'border-gray-200'
                }`}
                onClick={() => claim.status !== 'checked' && selectClaimToResearch(index)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold">{claim.headline}</h3>
                    <p className="text-sm text-gray-600">Submitted by: {claim.submitter}</p>
                  </div>
                  <div className="flex items-center">
                    {claim.status === 'checked' && <CheckCircle className="text-green-500" size={20} />}
                    {claim.status === 'skipped' && <X className="text-gray-500" size={20} />}
                    {claim.urgency === 'high' && claim.status === 'new' && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">Urgent</span>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-sm">
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">{claim.category}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };
  
  const renderResearch = () => {
    if (currentClaimIndex === null) return null;
    const currentClaim = inbox[currentClaimIndex];
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Research Phase</h2>
          <button 
            onClick={() => setStage('inbox')}
            className="text-gray-500 hover:text-gray-700"
          >
            Back to inbox
          </button>
        </div>
        
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold">Claim to verify:</h3>
          <p className="text-lg">{currentClaim.headline}</p>
          <p className="mt-2 text-gray-700">{currentClaim.details}</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold border-b pb-2 mb-3">Available Sources</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {sources.map(source => (
                <div 
                  key={source.id}
                  className={`p-3 border rounded cursor-pointer transition ${
                    selectedSources.includes(source.id) 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => toggleSource(source.id)}
                >
                  <div className="flex justify-between">
                    <div className="font-medium">{source.name}</div>
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        source.reliability === 'high' ? 'bg-green-100 text-green-800' :
                        source.reliability === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {source.reliability === 'high' ? 'Reliable' :
                         source.reliability === 'medium' ? 'Mixed' :
                         'Questionable'}
                      </span>
                    </div>
                  </div>
                  {selectedSources.includes(source.id) && (
                    <div className="mt-2 text-sm text-gray-700">
                      {source.info}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-4 border rounded-lg">
            <h3 className="font-bold border-b pb-2 mb-3">Your Assessment</h3>
            <p className="mb-4 text-sm text-gray-600">
              Based on your research, what's your verification of this claim?
            </p>
            
            <div className="space-y-2">
              <button
                onClick={() => submitVerification('true')}
                className="w-full p-3 bg-green-100 text-green-800 rounded-lg border border-green-200 hover:bg-green-200 transition flex items-center justify-center"
                disabled={selectedSources.length === 0}
              >
                <CheckCircle className="mr-2" size={18} />
                True
              </button>
              
              <button
                onClick={() => submitVerification('mostly-true')}
                className="w-full p-3 bg-blue-100 text-blue-800 rounded-lg border border-blue-200 hover:bg-blue-200 transition flex items-center justify-center"
                disabled={selectedSources.length === 0}
              >
                <AlertCircle className="mr-2" size={18} />
                Mostly True
              </button>
              
              <button
                onClick={() => submitVerification('false')}
                className="w-full p-3 bg-red-100 text-red-800 rounded-lg border border-red-200 hover:bg-red-200 transition flex items-center justify-center"
                disabled={selectedSources.length === 0}
              >
                <X className="mr-2" size={18} />
                False
              </button>
            </div>
            
            <button
              onClick={skipClaim}
              className="w-full mt-6 p-2 text-gray-500 hover:text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition text-sm"
            >
              Skip this claim (reputation penalty)
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const renderPublish = () => {
    if (currentClaimIndex === null) return null;
    // Don't create an unused variable
    
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold border-b pb-2">Publish Your Fact Check</h2>
        
                  <div className="p-4 bg-gray-50 border rounded-lg">
          <h3 className="font-bold">Your assessment:</h3>
          <div className={`mt-2 p-3 rounded-lg inline-block font-medium
            ${verification === 'true' ? 'bg-green-100 text-green-800' :
            verification === 'mostly-true' ? 'bg-blue-100 text-blue-800' :
            'bg-red-100 text-red-800'}`}>
            <span className="flex items-center">
              {verification === 'true' && <CheckCircle className="mr-2" size={18} />}
              {verification === 'mostly-true' && <AlertCircle className="mr-2" size={18} />}
              {verification === 'false' && <X className="mr-2" size={18} />}
              {verification === 'true' ? 'True' : 
               verification === 'mostly-true' ? 'Mostly True' : 
               'False'}
            </span>
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold">Claim:</h3>
            <p className="mt-1">{inbox[currentClaimIndex]?.headline}</p>
          </div>
          
          <div className="mt-4">
            <h4 className="font-medium">Source summary:</h4>
            <p className="text-sm text-gray-600">You checked {selectedSources.length} out of {sources.length} available sources.</p>
            
            <div className="mt-2 space-y-2">
              {sources.filter(source => selectedSources.includes(source.id)).map(source => (
                <div key={source.id} className="text-sm flex items-start">
                  <span className={`inline-block w-3 h-3 mt-1 mr-2 rounded-full ${
                    source.reliability === 'high' ? 'bg-green-500' :
                    source.reliability === 'medium' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></span>
                  <span>{source.name}: {source.info}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={publishFactCheck}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex-1 flex items-center justify-center"
          >
            <ExternalLink className="mr-2" size={18} />
            Publish Fact Check
          </button>
          
          <button
            onClick={() => setStage('research')}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            Back to Research
          </button>
        </div>
        
        {feedback && (
          <div className={`p-4 rounded-lg ${
            feedback.isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'
          }`}>
            <h3 className="font-bold">{feedback.isCorrect ? 'Good job!' : 'Needs improvement'}</h3>
            <p className="mt-1">{feedback.message}</p>
            <p className="mt-2 text-gray-700"><strong>Explanation:</strong> {feedback.explanation}</p>
          </div>
        )}
      </div>
    );
  };
  
  const renderTutorial = () => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-2xl">
          {tutorialStep === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Welcome to Fact Checker Simulator!</h2>
              <p className="mb-4">In this game, you'll take on the role of a fact-checker working to debunk misinformation and verify claims.</p>
              <p className="mb-4">Your goal is to investigate claims in your inbox, research sources, and publish accurate fact checks.</p>
            </div>
          )}
          
          {tutorialStep === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Your Inbox</h2>
              <p className="mb-4">Claims are submitted to your inbox for verification. Some are marked as urgent and should be prioritized.</p>
              <p className="mb-4">Select a claim to begin researching and verifying its accuracy.</p>
              <div className="p-3 border rounded-lg bg-gray-50 mb-4">
                <p className="font-medium">Example: "New Study: Chocolate Cures Common Cold"</p>
                <p className="text-sm text-gray-600">Submitted by: Health News Daily</p>
              </div>
            </div>
          )}
          
          {tutorialStep === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Research Phase</h2>
              <p className="mb-4">During research, you'll have access to various sources with different reliability levels:</p>
              <ul className="mb-4 space-y-2 list-disc pl-5">
                <li><span className="text-green-600 font-medium">Reliable Sources</span>: Official documents, peer-reviewed research, verified information</li>
                <li><span className="text-yellow-600 font-medium">Mixed Sources</span>: Mainstream media, professional blogs, interviews</li>
                <li><span className="text-red-600 font-medium">Questionable Sources</span>: Social media, partisan websites, anonymous reports</li>
              </ul>
              <p>Review multiple sources to get a complete picture. The more thorough your research, the more accurate your fact check will be.</p>
            </div>
          )}
          
          {tutorialStep === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Making Your Assessment</h2>
              <p className="mb-4">After gathering information, you'll need to make an assessment:</p>
              <ul className="mb-4 space-y-2 list-disc pl-5">
                <li><span className="text-green-600 font-medium">True</span>: The claim is accurate and supported by reliable evidence</li>
                <li><span className="text-blue-600 font-medium">Mostly True</span>: The core claim is accurate but needs clarification</li>
                <li><span className="text-red-600 font-medium">False</span>: The claim is inaccurate or misleading</li>
              </ul>
              <p>Your assessment should be based on the evidence you've gathered, not your personal opinion.</p>
            </div>
          )}
          
          {tutorialStep === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Game Objectives</h2>
              <p className="mb-4">Your performance is measured by:</p>
              <ul className="mb-4 space-y-2 list-disc pl-5">
                <li><span className="font-medium">Accuracy</span>: Making correct assessments</li>
                <li><span className="font-medium">Thoroughness</span>: Checking multiple sources</li>
                <li><span className="font-medium">Speed</span>: Completing fact checks efficiently</li>
                <li><span className="font-medium">Reputation</span>: Building trust through good work</li>
              </ul>
              <p>You have 3 minutes to complete as many accurate fact checks as possible. Good luck!</p>
            </div>
          )}
          
          <button 
            onClick={nextTutorialStep}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition mt-4"
          >
            {tutorialStep < 5 ? "Next" : "Start Playing"}
          </button>
        </div>
      </div>
    );
  };
  
  // Main game UI
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {showTutorial && renderTutorial()}
      
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Game header */}
        <div className="bg-blue-600 p-4 text-white">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold">Fact Checker Simulator</h1>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <Clock className="mr-1" size={18} />
                <span>{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2, '0')}</span>
              </div>
              <div className="flex items-center">
                <Award className="mr-1" size={18} />
                <span>{score} pts</span>
              </div>
              <div className="flex items-center">
                <Shield className="mr-1" size={18} />
                <span>Rep: {reputation}%</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Game content */}
        <div className="p-6">
          {!gameActive && !gameOver && (
            <div className="text-center py-10">
              <h2 className="text-2xl font-bold mb-4">Fact Checker Simulator</h2>
              <p className="mb-6 text-gray-600 max-w-md mx-auto">
                Take on the role of a professional fact-checker and help combat misinformation. Research claims, verify sources, and publish accurate fact checks!
              </p>
              <div className="space-y-4">
                <button 
                  onClick={startGame}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Start Game
                </button>
                <button 
                  onClick={() => setShowTutorial(true)}
                  className="block mx-auto text-blue-600 hover:underline"
                >
                  How to Play
                </button>
              </div>
            </div>
          )}
          
          {gameActive && (
            <div>
              {stage === 'inbox' && renderInbox()}
              {stage === 'research' && renderResearch()}
              {stage === 'publish' && renderPublish()}
            </div>
          )}
          
          {gameOver && (
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
              <p className="text-4xl font-bold text-blue-600 mb-6">{score} points</p>
              
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">{stats.accurate}</div>
                  <div className="text-sm text-gray-600">Accurate Checks</div>
                </div>
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">{stats.misleading}</div>
                  <div className="text-sm text-gray-600">Misleading Checks</div>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-3xl font-bold text-blue-600">{stats.thorough}</div>
                  <div className="text-sm text-gray-600">Thorough Research</div>
                </div>
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-3xl font-bold text-yellow-600">{stats.fast}</div>
                  <div className="text-sm text-gray-600">Quick Checks</div>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-bold mb-2">Final Reputation: {reputation}%</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="h-2.5 rounded-full" style={{
                    width: `${reputation}%`,
                    backgroundColor: reputation > 75 ? '#22c55e' : reputation > 50 ? '#eab308' : '#ef4444'
                  }}></div>
                </div>
              </div>
              
              <button 
                onClick={startGame}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center mx-auto"
              >
                <RefreshCw className="mr-2" size={18} />
                Play Again
              </button>
            </div>
          )}
        </div>
        
        {/* Game footer */}
        <div className="bg-gray-50 p-4 border-t">
          <div className="text-sm text-gray-600 text-center">
            Fact checking best practices: Verify multiple sources, consider source credibility, look for corroborating evidence, and be transparent about your process.
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
import React from 'react';
import { User, Award, CheckCircle, AlertCircle, Info, X, ChevronRight, RefreshCw } from 'lucide-react';
import climate from './assets/climate.jpeg';
import coffee from './assets/coffee.jpg';
import fruits from './assets/fruits.jpg';
import garlic from './assets/garlic.jpg';
import hurricane from './assets/hurricane.jpg';
import phone from './assets/phone.webp';
import protest from './assets/protest.webp';



function App() {
  // Game states
  const [gameState, setGameState] = React.useState('intro'); // intro, playing, results, tutorial
  const [score, setScore] = React.useState(0);
  const [lives, setLives] = React.useState(3);
  const [level, setLevel] = React.useState(1);
  const [currentPostIndex, setCurrentPostIndex] = React.useState(0);
  const [reviewedPosts, setReviewedPosts] = React.useState([]);
  const [showFeedback, setShowFeedback] = React.useState(false);
  const [isCorrect, setIsCorrect] = React.useState(false);
  const [showExplanation, setShowExplanation] = React.useState(false);
  const [showTip, setShowTip] = React.useState(false);
  const [tipUsed, setTipUsed] = React.useState(false);
  
  // Game content
  const gameLevels = [
    {
      name: "Clickbait & Sensationalism",
      description: "Learn to identify exaggerated headlines designed to grab attention rather than inform.",
      tips: ["Look for emotional language and excessive punctuation", "Check if the headline matches the actual content", "Be skeptical of 'shocking' or 'unbelievable' claims"]
    },
    {
      name: "Fake Sources & Attribution",
      description: "Identify false or misleading attributions to experts or organizations.",
      tips: ["Verify if the cited expert or organization exists", "Check if the expert has relevant credentials in the field", "Look for vague attributions like 'scientists say' without specifics"]
    },
    {
      name: "Manipulated Images & Context",
      description: "Spot images that have been altered or presented out of context.",
      tips: ["Check if the image looks unnaturally perfect or has odd elements", "Look for inconsistent lighting, shadows, or proportions", "Be wary of emotional images with limited context"]
    }
  ];

  // Mock social media posts with varying levels of misinformation
  const posts = [
    {
      id: 1,
      level: 1,
      author: "HealthNews247",
      content: "SHOCKING DISCOVERY: Doctors STUNNED as common fruit found to CURE all digestive issues!!! Click to see which fruit you should eat EVERY DAY!!!",
      image: fruits,
      likes: 1247,
      shares: 432,
      comments: 85,
      isMisinfo: true,
      misinfoType: "clickbait",
      explanation: "This post uses excessive capitalization, multiple exclamation points, and sensationalist language ('SHOCKING', 'STUNNED', 'CURE all'). Legitimate health findings are rarely presented as miracle cures and would include specific details about the research.",
      tip: "Watch for excessive punctuation (!!!) and ALL CAPS text, which are often used to create unwarranted excitement."
    },
    {
      id: 2,
      level: 1,
      author: "ScienceDaily",
      content: "New study from Stanford University finds that regular coffee consumption may reduce risk of certain inflammatory conditions by 15-20%. Research published in Journal of Nutrition.",
      image: coffee,
      likes: 543,
      shares: 127,
      comments: 42,
      isMisinfo: false,
      explanation: "This post presents measured claims with specific statistics (15-20%), names the research institution (Stanford), and mentions the publication (Journal of Nutrition). It uses moderate language ('may reduce risk') rather than claiming definitive cures.",
      tip: "Credible information typically includes specific details about research sources and uses measured language rather than absolute claims."
    },
    {
      id: 3,
      level: 1,
      author: "TechTrends",
      content: "This simple trick will DOUBLE your phone battery life overnight! Phone companies DON'T want you to know this!!",
      image: phone,
      likes: 3621,
      shares: 1289,
      comments: 346,
      isMisinfo: true,
      misinfoType: "clickbait",
      explanation: "This post makes an extraordinary claim without providing any specific method or evidence. It employs a conspiracy element ('Phone companies DON'T want you to know') to create urgency and excitement without substance.",
      tip: "Be skeptical of 'one simple trick' claims, especially when paired with conspiracy elements suggesting powerful entities are hiding information."
    },
    {
      id: 4,
      level: 2,
      author: "WorldNewsNetwork",
      content: "Top immunologists confirm that eating garlic prevents viral infections. Dr. Anderson of the International Health Institute recommends taking garlic supplements daily.",
      image: garlic,
      likes: 2156,
      shares: 872,
      comments: 167,
      isMisinfo: true,
      misinfoType: "fake_source",
      explanation: "This post attributes information to vague entities ('Top immunologists') and a specific-sounding but likely fabricated source ('Dr. Anderson' from the 'International Health Institute'). A quick verification would reveal this institute doesn't exist.",
      tip: "Always verify organizations and experts mentioned. Legitimate health information comes from recognized institutions and researchers whose credentials can be verified."
    },
    {
      id: 5,
      level: 2,
      author: "EnvironmentToday",
      content: "According to the latest NASA climate data, February 2024 was the warmest February on record globally, continuing a trend of rising temperatures observed over the past decade.",
      image: climate,
      likes: 876,
      shares: 324,
      comments: 129,
      isMisinfo: false,
      explanation: "This post cites a specific, verifiable source (NASA) and makes a claim that aligns with scientific consensus. The information is presented without sensationalism and refers to specific, measurable data.",
      tip: "Reliable information often cites specific, verifiable sources and presents information in a straightforward manner without emotional manipulation."
    },
    {
      id: 6,
      level: 3,
      author: "GlobalNews",
      content: "BREAKING: Massive crowd at downtown protest yesterday! The people have spoken!",
      image: protest,
      likes: 4582,
      shares: 2341,
      comments: 672,
      isMisinfo: true,
      misinfoType: "image_manipulation",
      explanation: "This post uses an image that appears to show a large crowd, but without context of when and where it was taken. Often, images from different events are repurposed to exaggerate attendance at recent gatherings.",
      tip: "For images claiming to show current events, look for multiple sources and specific details about the location, date, and context."
    },
    {
      id: 7,
      level: 3,
      author: "WeatherAlert",
      content: "Hurricane Maria approaching the Gulf Coast. Expected to make landfall Thursday. Residents in coastal areas should follow evacuation orders from local authorities.",
      image: hurricane,
      likes: 2893,
      shares: 1756,
      comments: 412,
      isMisinfo: false,
      explanation: "This post provides specific, actionable information about a weather event, including timing and instructions that align with standard emergency protocols. The advice to follow local authorities is appropriate.",
      tip: "During emergencies, reliable information includes specific details and directs people to official sources rather than making independent recommendations."
    }
  ];

  // Filter posts based on current level
  const currentLevelPosts = posts.filter(post => post.level <= level);

  // Reset game state
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    setLevel(1);
    setCurrentPostIndex(0);
    setReviewedPosts([]);
    setShowFeedback(false);
    setShowExplanation(false);
    setShowTip(false);
    setTipUsed(false);
  };

  // Handle user judgment of post
  const judgePost = (judgment) => {
    const currentPost = currentLevelPosts[currentPostIndex];
    const isUserCorrect = (judgment === 'misinfo' && currentPost.isMisinfo) || 
                          (judgment === 'reliable' && !currentPost.isMisinfo);
    
    setIsCorrect(isUserCorrect);
    setShowFeedback(true);
    
    if (isUserCorrect) {
      setScore(prevScore => prevScore + (tipUsed ? 5 : 10));
    } else {
      setLives(prevLives => prevLives - 1);
    }
    
    setReviewedPosts(prev => [...prev, {
      ...currentPost,
      userJudgment: judgment,
      isCorrect: isUserCorrect,
      tipUsed: tipUsed
    }]);
  };

  // Move to next post
  const nextPost = () => {
    setShowFeedback(false);
    setShowExplanation(false);
    setShowTip(false);
    setTipUsed(false);
    
    if (currentPostIndex + 1 < currentLevelPosts.length) {
      setCurrentPostIndex(prevIndex => prevIndex + 1);
    } else {
      // Level completed
      if (level < gameLevels.length) {
        setLevel(prevLevel => prevLevel + 1);
        setCurrentPostIndex(0);
      } else {
        // Game completed
        setGameState('results');
      }
    }
  };

  // Check if game over
  React.useEffect(() => {
    if (lives <= 0) {
      setGameState('results');
    }
  }, [lives]);

  // Calculate final score and stats
  const calculateAccuracy = () => {
    if (reviewedPosts.length === 0) return 0;
    const correctJudgments = reviewedPosts.filter(post => post.isCorrect).length;
    return Math.round((correctJudgments / reviewedPosts.length) * 100);
  };

  // Toggle tip visibility
  const toggleTip = () => {
    if (!showTip && !tipUsed) {
      setTipUsed(true);
    }
    setShowTip(!showTip);
  };

  // Component for social media post
  const SocialMediaPost = ({ post }) => (
    <div style={{
      backgroundColor: "white",
      borderRadius: "12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      padding: "20px",
      maxWidth: "100%",
      width: "100%",
      margin: "0 auto 28px auto",
      border: "1px solid #eaeaea"
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "16px"
      }}>
        <div style={{
          backgroundColor: "#f0f2f5",
          borderRadius: "50%",
          padding: "10px",
          marginRight: "12px"
        }}>
          <User size={24} color="#1877F2" />
        </div>
        <div style={{fontWeight: "600", fontSize: "16px", color: "#050505"}}>{post.author}</div>
      </div>
      <p style={{
        marginBottom: "16px", 
        fontSize: "16px", 
        lineHeight: "1.5",
        color: "#1c1e21"
      }}>{post.content}</p>
      <img 
        src={post.image} 
        alt="Post content" 
        style={{
          width: "100%",
          height: "300px",
          objectFit: "cover",
          borderRadius: "8px",
          marginBottom: "16px",
          border: "1px solid #eaeaea"
        }}
      />
      <div style={{
        display: "flex",
        color: "#65676b",
        fontSize: "14px",
        justifyContent: "space-between",
        fontWeight: "500"
      }}>
        <span>👍 {post.likes.toLocaleString()} Likes</span>
        <span>💬 {post.comments.toLocaleString()} Comments</span>
        <span>🔄 {post.shares.toLocaleString()} Shares</span>
      </div>
    </div>
  );

  // CSS for buttons
  const buttonStyles = {
    base: {
      padding: "12px 24px",
      borderRadius: "8px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      fontSize: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "all 0.2s ease",
      boxShadow: "0 2px 5px rgba(0,0,0,0.08)"
    },
    reliable: {
      backgroundColor: "#e8f5e9",
      color: "#2e7d32",
      border: "1px solid #a5d6a7",
    },
    reliableHover: {
      backgroundColor: "#c8e6c9",
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
    },
    misinfo: {
      backgroundColor: "#ffebee",
      color: "#c62828",
      border: "1px solid #ef9a9a",
    },
    misinfoHover: {
      backgroundColor: "#ffcdd2",
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
    },
    tip: {
      width: "100%",
      marginTop: "16px",
      backgroundColor: "#e3f2fd",
      border: "1px solid #bbdefb",
      color: "#1565c0"
    },
    tipHover: {
      backgroundColor: "#bbdefb",
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
    },
    primary: {
      backgroundColor: "#1976d2",
      color: "white",
      border: "none",
      boxShadow: "0 3px 5px rgba(0,0,0,0.2)"
    },
    primaryHover: {
      backgroundColor: "#1565c0",
      transform: "translateY(-2px)",
      boxShadow: "0 5px 10px rgba(0,0,0,0.2)"
    },
    secondary: {
      backgroundColor: "white",
      border: "1px solid #bbdefb",
      color: "#1976d2"
    },
    secondaryHover: {
      backgroundColor: "#e3f2fd",
      transform: "translateY(-2px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.1)"
    }
  };

  // Main styles for game container
  const mainContainerStyle = {
    minHeight: "100vh",
    minWidth: "100vw",
    backgroundColor: "#f0f2f5",
    padding: "32px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    color: "#1c1e21",
    margin: 0,
    boxSizing: "border-box",
    overflowX: "hidden"
  };

  // Render different game screens
  const renderGameContent = () => {
    switch (gameState) {
      case 'intro':
        return (
          <div style={{
            maxWidth: "800px",
            width: "100%",
            margin: "0 auto",
            padding: "40px",
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            border: "1px solid #eaeaea"
          }}>
            <h1 style={{
              fontSize: "42px",
              fontWeight: "bold",
              marginBottom: "24px",
              color: "#1877F2",
              textAlign: "center"
            }}>Truth Detective</h1>
            
            <p style={{
              marginBottom: "24px",
              fontSize: "18px",
              lineHeight: "1.6",
              color: "#444",
              textAlign: "center"
            }}>
              In this game, you'll navigate through a simulated social media feed and learn to identify misinformation.
            </p>
            
            <div style={{marginBottom: "36px"}}>
              <h2 style={{
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#1877F2"
              }}>How to Play:</h2>
              <ul style={{
                listStyleType: "disc",
                paddingLeft: "24px",
                lineHeight: "1.6",
                fontSize: "16px",
                color: "#444"
              }}>
                <li>Examine each social media post carefully</li>
                <li>Decide if it contains misinformation or seems reliable</li>
                <li>Use the "Get a Tip" feature when you're unsure (costs points)</li>
                <li>Learn from feedback to improve your misinformation detection skills</li>
              </ul>
            </div>
            
            <div style={{marginBottom: "36px"}}>
              <h2 style={{
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#1877F2"
              }}>You'll Learn About:</h2>
              <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                {gameLevels.map((level, index) => (
                  <div key={index} style={{
                    padding: "20px",
                    backgroundColor: "#f0f7ff",
                    borderRadius: "12px",
                    border: "1px solid #bbdefb"
                  }}>
                    <h3 style={{
                      fontWeight: "600", 
                      fontSize: "18px", 
                      color: "#1565c0",
                      marginBottom: "8px"
                    }}>{level.name}</h3>
                    <p style={{
                      fontSize: "16px", 
                      color: "#444",
                      lineHeight: "1.5"
                    }}>{level.description}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <button 
              onClick={startGame} 
              style={{
                ...buttonStyles.base,
                ...buttonStyles.primary,
                width: "100%",
                padding: "16px",
                fontSize: "18px"
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = buttonStyles.primaryHover.backgroundColor;
                e.target.style.transform = buttonStyles.primaryHover.transform;
                e.target.style.boxShadow = buttonStyles.primaryHover.boxShadow;
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = buttonStyles.primary.backgroundColor;
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = buttonStyles.primary.boxShadow;
              }}
            >
              Start Game
            </button>
          </div>
        );
        
      case 'playing': {
        // Wrapped in curly braces to fix the no-case-declarations error
        const currentPost = currentLevelPosts[currentPostIndex];
        return (
          <div style={{
            maxWidth: "900px", 
            width: "100%", 
            margin: "0 auto"
          }}>
            <div style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "16px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              marginBottom: "28px",
              border: "1px solid #eaeaea"
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px"
              }}>
                <div style={{
                  fontWeight: "600", 
                  fontSize: "22px", 
                  color: "#1877F2"
                }}>
                  Level {level}: {gameLevels[level-1].name}
                </div>
                <div style={{display: "flex", gap: "24px", alignItems: "center"}}>
                  <div style={{
                    display: "flex", 
                    alignItems: "center", 
                    backgroundColor: "#f6f7f9", 
                    padding: "8px 16px", 
                    borderRadius: "20px"
                  }}>
                    <Award style={{color: "#ffc107", marginRight: "8px"}} size={20} />
                    <span style={{fontWeight: "600", color: "#444"}}>{score}</span>
                  </div>
                  <div style={{display: "flex"}}>
                    {[...Array(lives)].map((_, i) => (
                      <span key={i} style={{fontSize: "20px"}}>❤️</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{
                height: "8px",
                width: "100%",
                backgroundColor: "#ebedf0",
                borderRadius: "8px",
                overflow: "hidden"
              }}>
                <div 
                  style={{
                    height: "100%",
                    backgroundColor: "#1877F2",
                    borderRadius: "8px",
                    width: `${((currentPostIndex + 1) / currentLevelPosts.length) * 100}%`,
                    transition: "width 0.3s ease"
                  }}
                ></div>
              </div>
            </div>
            
            <SocialMediaPost post={currentPost} />
            
            {!showFeedback ? (
              <div style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                border: "1px solid #eaeaea"
              }}>
                <div style={{
                  fontWeight: "600", 
                  marginBottom: "20px", 
                  fontSize: "18px", 
                  color: "#1c1e21"
                }}>
                  What do you think about this post?
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: window.innerWidth < 768 ? "column" : "row",
                  gap: "16px"
                }}>
                  <button 
                    onClick={() => judgePost('reliable')}
                    style={{
                      ...buttonStyles.base,
                      ...buttonStyles.reliable,
                      flex: 1
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = buttonStyles.reliableHover.backgroundColor;
                      e.target.style.transform = buttonStyles.reliableHover.transform;
                      e.target.style.boxShadow = buttonStyles.reliableHover.boxShadow;
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = buttonStyles.reliable.backgroundColor;
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = buttonStyles.base.boxShadow;
                    }}
                  >
                    <CheckCircle size={20} style={{marginRight: "10px"}} />
                    Seems Reliable
                  </button>
                  <button 
                    onClick={() => judgePost('misinfo')}
                    style={{
                      ...buttonStyles.base,
                      ...buttonStyles.misinfo,
                      flex: 1
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = buttonStyles.misinfoHover.backgroundColor;
                      e.target.style.transform = buttonStyles.misinfoHover.transform;
                      e.target.style.boxShadow = buttonStyles.misinfoHover.boxShadow;
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = buttonStyles.misinfo.backgroundColor;
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = buttonStyles.base.boxShadow;
                    }}
                  >
                    <AlertCircle size={20} style={{marginRight: "10px"}} />
                    Likely Misinformation
                  </button>
                </div>
                <button 
                  onClick={toggleTip}
                  style={{
                    ...buttonStyles.base,
                    ...buttonStyles.tip
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = buttonStyles.tipHover.backgroundColor;
                    e.target.style.transform = buttonStyles.tipHover.transform;
                    e.target.style.boxShadow = buttonStyles.tipHover.boxShadow;
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = buttonStyles.tip.backgroundColor;
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = buttonStyles.base.boxShadow;
                  }}
                >
                  <Info size={20} style={{marginRight: "10px"}} />
                  {showTip ? "Hide Tip" : "Get a Tip (-5 points)"}
                </button>
                {showTip && (
                  <div style={{
                    marginTop: "16px",
                    padding: "16px",
                    backgroundColor: "#e3f2fd",
                    borderRadius: "8px",
                    fontSize: "16px",
                    lineHeight: "1.5",
                    color: "#1565c0",
                    border: "1px solid #bbdefb"
                  }}>
                    <p>{currentPost.tip}</p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                backgroundColor: "white",
                padding: "24px",
                borderRadius: "16px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                border: "1px solid #eaeaea"
              }}>
                <div style={{
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  backgroundColor: isCorrect ? "#e8f5e9" : "#ffebee",
                  color: isCorrect ? "#2e7d32" : "#c62828",
                  border: isCorrect ? "1px solid #a5d6a7" : "1px solid #ef9a9a"
                }}>
                  <div style={{
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    fontSize: "18px",
                    marginBottom: "8px"
                  }}>
                    {isCorrect ? (
                      <>
                        <CheckCircle size={20} style={{marginRight: "10px"}} />
                        Correct!
                      </>
                    ) : (
                      <>
                        <X size={20} style={{marginRight: "10px"}} />
                        Not quite right
                      </>
                    )}
                  </div>
                  <p style={{
                    fontSize: "16px", 
                    lineHeight: "1.5"
                  }}>
                    This post is {currentPost.isMisinfo ? 'misinformation' : 'reliable'}.
                    {tipUsed && isCorrect && " (5 points awarded - tip used)"}
                    {!tipUsed && isCorrect && " (10 points awarded)"}
                  </p>
                </div>
                
                {!showExplanation ? (
                  <button 
                    onClick={() => setShowExplanation(true)}
                    style={{
                      ...buttonStyles.base,
                      ...buttonStyles.primary,
                      width: "100%"
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = buttonStyles.primaryHover.backgroundColor;
                      e.target.style.transform = buttonStyles.primaryHover.transform;
                      e.target.style.boxShadow = buttonStyles.primaryHover.boxShadow;
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = buttonStyles.primary.backgroundColor;
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = buttonStyles.primary.boxShadow;
                    }}
                  >
                    Show Explanation
                  </button>
                ) : (
                  <div style={{marginBottom: "16px"}}>
                    <div style={{
                      fontWeight: "600", 
                      marginBottom: "8px", 
                      fontSize: "18px", 
                      color: "#1c1e21"
                    }}>Why?</div>
                    <p style={{
                      fontSize: "16px", 
                      marginBottom: "20px", 
                      lineHeight: "1.6", 
                      color: "#444"
                    }}>{currentPost.explanation}</p>
                    <button 
                      onClick={nextPost}
                      style={{
                        ...buttonStyles.base,
                        ...buttonStyles.primary,
                        width: "100%"
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = buttonStyles.primaryHover.backgroundColor;
                        e.target.style.transform = buttonStyles.primaryHover.transform;
                        e.target.style.boxShadow = buttonStyles.primaryHover.boxShadow;
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = buttonStyles.primary.backgroundColor;
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = buttonStyles.primary.boxShadow;
                      }}
                    >
                      Next Post
                      <ChevronRight size={20} style={{marginLeft: "10px"}} />
                      Next Post
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
      
      case 'results': {
        // Wrapped in curly braces to fix the no-case-declarations error
        const accuracy = calculateAccuracy();
        return (
          <div style={{
            maxWidth: "800px",
            width: "100%",
            margin: "0 auto",
            padding: "40px",
            backgroundColor: "white",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
            border: "1px solid #eaeaea"
          }}>
            <h1 style={{
              fontSize: "42px",
              fontWeight: "bold",
              marginBottom: "24px",
              color: "#1877F2",
              textAlign: "center"
            }}>Game Results</h1>
            
            <div style={{
              marginBottom: "36px",
              textAlign: "center"
            }}>
              <div style={{
                fontSize: "64px",
                fontWeight: "bold",
                marginBottom: "8px",
                color: "#1877F2"
              }}>{score}</div>
              <div style={{
                color: "#65676b", 
                fontSize: "18px",
                fontWeight: "500"
              }}>Final Score</div>
            </div>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              marginBottom: "36px"
            }}>
              <div style={{
                padding: "24px",
                backgroundColor: "#f0f7ff",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #bbdefb"
              }}>
                <div style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#1565c0"
                }}>{accuracy}%</div>
                <div style={{fontSize: "16px", color: "#65676b", fontWeight: "500"}}>Accuracy</div>
              </div>
              <div style={{
                padding: "24px",
                backgroundColor: "#f0f7ff",
                borderRadius: "12px",
                textAlign: "center",
                border: "1px solid #bbdefb"
              }}>
                <div style={{
                  fontSize: "36px",
                  fontWeight: "bold",
                  marginBottom: "8px",
                  color: "#1565c0"
                }}>{reviewedPosts.length}</div>
                <div style={{fontSize: "16px", color: "#65676b", fontWeight: "500"}}>Posts Reviewed</div>
              </div>
            </div>
            
            <div style={{marginBottom: "36px"}}>
              <h2 style={{
                fontSize: "24px",
                fontWeight: "600",
                marginBottom: "16px",
                color: "#1877F2"
              }}>What You've Learned:</h2>
              <div style={{display: "flex", flexDirection: "column", gap: "16px"}}>
                {Array.from(new Set(reviewedPosts.filter(post => post.isMisinfo).map(post => post.misinfoType))).map((type, index) => {
                  const misinfoType = type === "clickbait" ? "Clickbait & Sensationalism"
                                    : type === "fake_source" ? "Fake Sources & Attribution"
                                    : "Manipulated Images & Context";
                  return (
                    <div key={index} style={{
                      padding: "20px",
                      backgroundColor: "#f0f7ff",
                      borderRadius: "12px",
                      border: "1px solid #bbdefb"
                    }}>
                      <h3 style={{
                        fontWeight: "600", 
                        fontSize: "18px", 
                        color: "#1565c0",
                        marginBottom: "8px"
                      }}>{misinfoType}</h3>
                      <p style={{
                        fontSize: "16px", 
                        color: "#444",
                        lineHeight: "1.5"
                      }}>{gameLevels.find(level => level.name === misinfoType)?.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div style={{
              display: "flex",
              flexDirection: window.innerWidth < 768 ? "column" : "row",
              gap: "16px"
            }}>
              <button 
                onClick={startGame}
                style={{
                  ...buttonStyles.base,
                  ...buttonStyles.primary,
                  flex: 1,
                  padding: "16px",
                  fontSize: "18px"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = buttonStyles.primaryHover.backgroundColor;
                  e.target.style.transform = buttonStyles.primaryHover.transform;
                  e.target.style.boxShadow = buttonStyles.primaryHover.boxShadow;
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = buttonStyles.primary.backgroundColor;
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = buttonStyles.primary.boxShadow;
                }}
              >
                <RefreshCw size={20} style={{marginRight: "10px"}} />
                Play Again
              </button>
              <button 
                onClick={() => setGameState('intro')}
                style={{
                  ...buttonStyles.base,
                  ...buttonStyles.secondary,
                  flex: 1,
                  padding: "16px",
                  fontSize: "18px"
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = buttonStyles.secondaryHover.backgroundColor;
                  e.target.style.transform = buttonStyles.secondaryHover.transform;
                  e.target.style.boxShadow = buttonStyles.secondaryHover.boxShadow;
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = buttonStyles.secondary.backgroundColor;
                  e.target.style.transform = "translateY(0)";
                  e.target.style.boxShadow = buttonStyles.base.boxShadow;
                }}
              >
                Return to Menu
              </button>
            </div>
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return (
    <div style={mainContainerStyle}>
      {renderGameContent()}
    </div>
  );
}

export default App;
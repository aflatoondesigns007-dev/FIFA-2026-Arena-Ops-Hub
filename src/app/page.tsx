'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  Send, 
  Bus, 
  Activity, 
  CloudRain, 
  Users, 
  CheckCircle, 
  TrendingUp, 
  Leaf, 
  Clock, 
  Accessibility, 
  Coffee, 
  Volume2, 
  VolumeX,
  Gauge,
  AlertCircle
} from 'lucide-react';
import StadiumMap from './StadiumMap';
import { 
  SCENARIOS, 
  Incident, 
  TransitInfo, 
  getAIConciergeReply 
} from './simulatorData';

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

export default function Home() {
  // Modes & Scenarios State
  const [viewMode, setViewMode] = useState<'fan' | 'staff'>('fan');
  const [activeScenario, setActiveScenario] = useState<string>('normal');
  const [activeLayer, setActiveLayer] = useState<'heatmap' | 'amenities' | 'accessibility' | 'security'>('heatmap');
  
  // Simulation Metrics & Lists
  const [incidents, setIncidents] = useState<Incident[]>(SCENARIOS.normal.incidentsList);
  const [transitList, setTransitList] = useState<TransitInfo[]>(SCENARIOS.normal.transitList);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncidentPlan, setSelectedIncidentPlan] = useState<string>('');
  const [isAnalyzingIncident, setIsAnalyzingIncident] = useState<boolean>(false);
  
  // Fan Interaction State
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'bot', text: 'Hello! I am your **FIFA 2026 Arena Concierge**. I can help you with stadium navigation, queue times, transit routes, or accessibility services. Type your question below!' }
  ]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const [fanPoints, setFanPoints] = useState<number>(120); // Sustainability game points
  const [audioAnnounce, setAudioAnnounce] = useState<boolean>(false); // Audio guide mode

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Sync state when simulation scenario changes
  useEffect(() => {
    const data = SCENARIOS[activeScenario];
    if (data) {
      setIncidents(data.incidentsList.map(inc => ({ ...inc }))); // Deep copy to edit status
      setTransitList(data.transitList);
      setSelectedIncidentId(null);
      setSelectedIncidentPlan('');
      
      // Trigger Toast Notification on scenario changes
      setToast({
        title: `${data.name} Active`,
        message: data.description,
        type: activeScenario === 'normal' ? 'info' : 'warning'
      });
      
      // Push automated alerts to concierge when incident changes
      if (activeScenario === 'rain') {
        pushSystemAlert("🌧️ Heavy Rain Warning: Outdoor transit loops are experiencing delays. Covered walkway overlays are now highlighted on the map.");
      } else if (activeScenario === 'overcrowd') {
        pushSystemAlert("🚨 Crowding Alert: Gate C is extremely congested. Directing traffic to Gates B & D.");
      } else if (activeScenario === 'vip') {
        pushSystemAlert("👑 VIP Convoy: VVIP security corridor active. Some pedestrian access corridors near West Plaza are temporarily closed.");
      }
    }
  }, [activeScenario]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  const pushSystemAlert = (text: string) => {
    setMessages(prev => [
      ...prev,
      { sender: 'bot', text }
    ]);
  };

  // Chat message submission
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setIsBotTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, scenario: activeScenario })
      });

      setIsBotTyping(false);

      if (!response.body) {
        // Fallback to offline reply
        const fallback = getAIConciergeReply(text, activeScenario);
        setMessages(prev => [...prev, { sender: 'bot', text: fallback }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamingText = "";

      // Append empty bot bubble to start streaming chunks
      setMessages(prev => [...prev, { sender: 'bot', text: "" }]);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunk = decoder.decode(value, { stream: true });
        streamingText += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { sender: 'bot', text: streamingText };
          return updated;
        });
      }
      
      // Text-to-speech for accessibility (audio announcement) if enabled
      if (audioAnnounce && 'speechSynthesis' in window) {
        // Clean markdown links or symbols for cleaner voice
        const spokenText = streamingText.replace(/\*\*|#|♿|🍴/g, '');
        const utterance = new SpeechSynthesisUtterance(spokenText);
        window.speechSynthesis.speak(utterance);
      }

    } catch (e) {
      console.error(e);
      setIsBotTyping(false);
      const fallback = getAIConciergeReply(text, activeScenario);
      setMessages(prev => [...prev, { sender: 'bot', text: fallback }]);
    }
  };

  // AI dispatch action
  const handleGenerateDispatch = async (incident: Incident) => {
    setIsAnalyzingIncident(true);
    setSelectedIncidentPlan('');

    try {
      const response = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident, scenario: activeScenario })
      });

      const data = await response.json();
      setIsAnalyzingIncident(false);
      
      if (data.plan) {
        setSelectedIncidentPlan(data.plan);
      } else {
        setSelectedIncidentPlan("Error generating dispatch instructions.");
      }
    } catch (e) {
      setIsAnalyzingIncident(false);
      setSelectedIncidentPlan("Offline: Proceed immediately with standard protocols. Support dispatcher alert sent.");
    }
  };

  // Modify incident status locally
  const updateIncidentStatus = (id: string, newStatus: 'active' | 'dispatched' | 'resolved') => {
    setIncidents(prev => 
      prev.map(inc => {
        if (inc.id === id) {
          const updated = { ...inc, status: newStatus };
          if (newStatus === 'dispatched') {
            updated.volunteerAssigned = "Unit 4 (Clara)";
          }
          return updated;
        }
        return inc;
      })
    );
    
    if (newStatus === 'dispatched') {
      setToast({
        title: "Crew Dispatched",
        message: `Rapid response unit dispatched to location. ETA: 2 mins.`,
        type: 'info'
      });
    } else if (newStatus === 'resolved') {
      setToast({
        title: "Incident Resolved",
        message: "Incident has been cleared and logged in database.",
        type: 'success'
      });
    }
    
    // Clear display details if resolved
    if (newStatus === 'resolved') {
      setSelectedIncidentId(null);
      setSelectedIncidentPlan('');
    }
  };

  const activeIncident = incidents.find(inc => inc.id === selectedIncidentId);

  // Scan Cup Action (sustainability engagement)
  const handleScanCup = () => {
    setFanPoints(prev => prev + 15);
    setToast({
      title: "Eco-Reward Scanned!",
      message: "Thank you for recycling your smart cup. +15 Tournament Points added.",
      type: "success"
    });
  };

  // Helper metrics based on active scenarios
  const currentMetrics = SCENARIOS[activeScenario].impactMetrics;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-glow">⚽</div>
          <div>
            <h1 className="brand-title">Arena-Ops Hub</h1>
          </div>
          <span className="badge-2026">FIFA World Cup 2026</span>
        </div>

        {/* View controller & current mode indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="toggle-views">
            <button 
              className={`toggle-btn ${viewMode === 'fan' ? 'active' : ''}`}
              onClick={() => { setViewMode('fan'); setActiveLayer('heatmap'); }}
            >
              ⚽ Fan Portal
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'staff' ? 'active' : ''}`}
              onClick={() => { setViewMode('staff'); setActiveLayer('security'); }}
            >
              🛠️ Command Center
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span className="status-indicator online"></span>
            MetLife Stadium Ops
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="app-body">
        
        {/* Navigation Sidebar */}
        <nav className="sidebar">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Navigation
            </div>
            <ul className="nav-links">
              <li className="nav-item">
                <button 
                  className={`nav-btn ${viewMode === 'fan' ? 'active' : ''}`}
                  onClick={() => setViewMode('fan')}
                >
                  <Sparkles size={16} /> Fan Experience
                </button>
              </li>
              <li className="nav-item">
                <button 
                  className={`nav-btn ${viewMode === 'staff' ? 'active' : ''}`}
                  onClick={() => setViewMode('staff')}
                >
                  <Gauge size={16} /> Organizer Dashboard
                </button>
              </li>
            </ul>
          </div>

          {/* Environmental Sustainability Sidebar Stats */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent-green)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>
              <Leaf size={14} /> Green Goal 2026
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Stadium recycling target: 95%
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ width: `${currentMetrics.sustainabilityScore}%`, height: '100%', background: 'var(--color-accent-green)' }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Current: {currentMetrics.sustainabilityScore}%
            </div>
          </div>
        </nav>

        {/* Dynamic Main Workspace depending on ViewMode */}
        {viewMode === 'fan' ? (
          
          /* ==================================================== */
          /* FAN PORTAL VIEW                                      */
          /* ==================================================== */
          <div className="dashboard-grid">
            
            {/* Column 1: AI Concierge Assistant */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Sparkles className="panel-title-icon" size={18} style={{ color: 'var(--color-accent-purple)' }} />
                  <span className="panel-title">GenAI Assistant</span>
                </div>
                {/* Audio voice selector toggle */}
                <button 
                  onClick={() => setAudioAnnounce(prev => !prev)}
                  style={{ background: 'none', border: 'none', color: audioAnnounce ? 'var(--color-accent-purple)' : 'var(--text-muted)', cursor: 'pointer' }}
                  title="Toggle Audio Readback"
                >
                  {audioAnnounce ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              </div>

              <div className="chat-container">
                <div className="chat-history">
                  {messages.map((msg, index) => (
                    <div key={index} className={`chat-bubble ${msg.sender}`}>
                      {msg.text.split('\n\n').map((para, pi) => (
                        <p key={pi} style={{ marginBottom: pi < msg.text.split('\n\n').length - 1 ? '8px' : '0' }}>
                          {para.startsWith('⚠️') || para.startsWith('🚨') ? (
                            <span style={{ color: 'var(--color-accent-red)', fontWeight: 600 }}>{para}</span>
                          ) : para}
                        </p>
                      ))}
                    </div>
                  ))}
                  
                  {isBotTyping && (
                    <div className="chat-bubble bot" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="quick-questions">
                  <button className="quick-q-btn" onClick={() => handleSendMessage("Where is the nearest ADA elevator?")}>♿ ADA Ramps & Elevators</button>
                  <button className="quick-q-btn" onClick={() => handleSendMessage("How do I get to public transit after the match?")}>🚆 Public Transit Routes</button>
                  <button className="quick-q-btn" onClick={() => handleSendMessage("Where is the food section?")}>🍴 Food Concessions</button>
                  <button className="quick-q-btn" onClick={() => handleSendMessage("How does recycling work here?")}>♻️ Sustainability Cup rewards</button>
                </div>

                <div className="chat-input-area">
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder="Ask about gates, transit, food, sensory rooms..." 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                  />
                  <button className="chat-send-btn" onClick={() => handleSendMessage(chatInput)}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: Interactive SVG Stadium Map */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Activity className="panel-title-icon" size={18} />
                  <span className="panel-title">Interactive Arena Map</span>
                </div>
              </div>

              {/* Map Canvas with float triggers */}
              <div style={{ flex: 1, position: 'relative' }}>
                <StadiumMap
                  activeLayer={activeLayer}
                  incidents={incidents}
                  selectedIncidentId={null}
                  onSelectIncident={() => {}}
                  densityOverrides={SCENARIOS[activeScenario].mapDensityOverrides}
                />

                {/* Floater Filters */}
                <div className="map-controls-floating">
                  <button 
                    className={`map-layer-btn ${activeLayer === 'heatmap' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('heatmap')}
                    title="Crowd Heatmap"
                  >
                    <Users size={16} />
                  </button>
                  <button 
                    className={`map-layer-btn ${activeLayer === 'amenities' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('amenities')}
                    title="Food & Amenities"
                  >
                    <Coffee size={16} />
                  </button>
                  <button 
                    className={`map-layer-btn ${activeLayer === 'accessibility' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('accessibility')}
                    title="Accessibility Guides"
                  >
                    <Accessibility size={16} />
                  </button>
                  <button 
                    className={`map-layer-btn ${activeLayer === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('security')}
                    title="Gates & Security"
                  >
                    <ShieldAlert size={16} />
                  </button>
                </div>

                {/* Map Legends based on active layer */}
                <div className="map-legend">
                  {activeLayer === 'heatmap' && (
                    <>
                      <div className="legend-item"><div className="legend-color" style={{ backgroundColor: 'rgba(244, 63, 94, 0.4)' }}></div> High Density</div>
                      <div className="legend-item"><div className="legend-color" style={{ backgroundColor: 'rgba(245, 158, 11, 0.3)' }}></div> Moderate Wait</div>
                      <div className="legend-item"><div className="legend-color" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)' }}></div> Smooth Flow</div>
                    </>
                  )}
                  {activeLayer === 'amenities' && (
                    <>
                      <div className="legend-item"><div className="legend-color concession"></div> Concession Stand</div>
                      <div className="legend-item"><div className="legend-color restroom"></div> Restrooms</div>
                    </>
                  )}
                  {activeLayer === 'accessibility' && (
                    <>
                      <div className="legend-item"><div className="legend-color ramp"></div> Accessible Ramps</div>
                      <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#a855f7' }}></div> Sensory Quiet Room</div>
                    </>
                  )}
                  {activeLayer === 'security' && (
                    <>
                      <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#94a3b8' }}></div> Main Security Gate</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column 3: Live Transit & Sustainability Widget */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Bus className="panel-title-icon" size={18} />
                  <span className="panel-title">Transit & Fan Hub</span>
                </div>
              </div>

              {/* Dynamic transit status board */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Matchday Travel Schedules
                </div>
                {transitList.map((transit, idx) => (
                  <div key={idx} style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'white' }}>{transit.name}</span>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700,
                        color: transit.status === 'normal' ? 'var(--color-accent-green)' : transit.status === 'delayed' ? 'var(--color-accent-red)' : 'var(--color-accent-yellow)'
                      }}>
                        {transit.waitingTime} wait ({transit.status.toUpperCase()})
                      </span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{transit.summary}</p>
                  </div>
                ))}
              </div>

              {/* Interactive Eco-Game Component */}
              <div style={{ flex: 1, marginTop: '20px', padding: '16px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(59, 130, 246, 0.02))', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-green)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '8px' }}>
                    <Leaf size={16} /> Eco-Cup Rewards
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                    MetLife Stadium utilizes smart returnable cups. Return yours to a recycling bin and scan the barcode below to earn reward tokens for concession discounts!
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>YOUR GREEN POINTS</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{fanPoints} pts</div>
                  </div>
                  <button 
                    onClick={handleScanCup}
                    style={{ background: 'var(--color-accent-green)', border: 'none', padding: '6px 12px', color: 'white', fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Scan Cup Code
                  </button>
                </div>
              </div>
            </div>

          </div>
        ) : (
          
          /* ==================================================== */
          /* ORGANIZERS & STAFF COMMAND CENTER                    */
          /* ==================================================== */
          <div className="dashboard-grid">
            
            {/* Column 1: Live Analytics & Incident Dispatcher */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <ShieldAlert className="panel-title-icon" size={18} style={{ color: 'var(--color-accent-red)' }} />
                  <span className="panel-title">Active Incident Feed</span>
                </div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(244,63,94,0.1)', color: 'var(--color-accent-red)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {incidents.filter(i => i.status !== 'resolved').length} Alerts
                </span>
              </div>

              {/* Incidents listing */}
              <div className="incidents-list">
                {incidents.map((incident) => (
                  <div 
                    key={incident.id} 
                    className={`incident-card priority-${incident.priority} ${selectedIncidentId === incident.id ? 'active-selected' : ''}`}
                    onClick={() => {
                      setSelectedIncidentId(incident.id);
                      setSelectedIncidentPlan('');
                    }}
                  >
                    <div className="incident-header">
                      <span className="incident-title">{incident.title}</span>
                      <span className="incident-time">{incident.time}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className="incident-location">{incident.location}</span>
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '1px 6px', 
                        borderRadius: '10px', 
                        fontWeight: 700,
                        backgroundColor: incident.status === 'active' ? 'rgba(244,63,94,0.15)' : 'rgba(59,130,246,0.15)',
                        color: incident.status === 'active' ? 'var(--color-accent-red)' : 'var(--color-brand)'
                      }}>
                        {incident.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Incident Actions */}
              {activeIncident ? (
                <div className="dispatch-details">
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'white', marginBottom: '2px' }}>
                    Incident Description:
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '6px' }}>
                    {activeIncident.description}
                  </p>

                  {/* AI response box */}
                  {isAnalyzingIncident && (
                    <div className="ai-recommendation-box" style={{ borderColor: 'var(--color-accent-purple)' }}>
                      <span className="status-indicator simulating"></span>
                      GenAI dispatch engine analyzing layout and priority...
                    </div>
                  )}

                  {selectedIncidentPlan && (
                    <div className="ai-recommendation-box">
                      {selectedIncidentPlan.split('\n').map((line, li) => (
                        <div key={li} style={{ marginBottom: '4px' }}>{line}</div>
                      ))}
                    </div>
                  )}

                  <div className="dispatch-actions">
                    {!selectedIncidentPlan && !isAnalyzingIncident && (
                      <button 
                        className="dispatch-btn primary"
                        onClick={() => handleGenerateDispatch(activeIncident)}
                        style={{ background: 'var(--color-accent-purple)' }}
                      >
                        <Sparkles size={12} /> AI Dispatch Analysis
                      </button>
                    )}
                    
                    {activeIncident.status === 'active' && (
                      <button 
                        className="dispatch-btn primary"
                        onClick={() => updateIncidentStatus(activeIncident.id, 'dispatched')}
                      >
                        Dispatch Crew
                      </button>
                    )}

                    {activeIncident.status === 'dispatched' && (
                      <button 
                        className="dispatch-btn primary"
                        onClick={() => updateIncidentStatus(activeIncident.id, 'resolved')}
                        style={{ background: 'var(--color-accent-green)' }}
                      >
                        Mark Resolved
                      </button>
                    )}
                    
                    <button 
                      className="nav-btn"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', textAlign: 'center', width: 'auto' }}
                      onClick={() => { setSelectedIncidentId(null); setSelectedIncidentPlan(''); }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                  Select an incident card or map marker to view AI recommendations and dispatch resources.
                </div>
              )}
            </div>

            {/* Column 2: Interactive SVG Stadium Map for Staff */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Activity className="panel-title-icon" size={18} />
                  <span className="panel-title">Real-Time Security Map Overlay</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    className={`toggle-btn ${activeLayer === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('security')}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    Gates
                  </button>
                  <button 
                    className={`toggle-btn ${activeLayer === 'heatmap' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('heatmap')}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    Heatmap
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, position: 'relative' }}>
                <StadiumMap
                  activeLayer={activeLayer}
                  incidents={incidents}
                  selectedIncidentId={selectedIncidentId}
                  onSelectIncident={(id) => {
                    setSelectedIncidentId(id);
                    setSelectedIncidentPlan('');
                  }}
                  densityOverrides={SCENARIOS[activeScenario].mapDensityOverrides}
                />
              </div>
            </div>

            {/* Column 3: Live Arena Operations Stats & Simulator */}
            <div className="dashboard-panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Clock className="panel-title-icon" size={18} />
                  <span className="panel-title">Arena Operations Control</span>
                </div>
              </div>

              {/* Simulation metrics */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">Avg Gate Wait</span>
                  <span className="stat-val">{currentMetrics.avgGateWait}</span>
                  <span className="stat-trend down">
                    <TrendingUp size={10} /> Live Flow
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Crowd Density Index</span>
                  <span className="stat-val">{currentMetrics.crowdIndex}%</span>
                  <span className="stat-trend up">
                    Steady flow
                  </span>
                </div>
              </div>

              {/* Interactive Scenario Trigger System */}
              <div className="simulator-panel" style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  Live Incident Scenario Simulator
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  Trigger simulated matches event conditions to see how the GenAI recommendations and map visualization adapt in real time.
                </p>

                {Object.keys(SCENARIOS).map((key) => {
                  const scen = SCENARIOS[key];
                  const isActive = activeScenario === key;
                  return (
                    <button
                      key={key}
                      className={`scenario-button ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveScenario(key)}
                    >
                      <div>
                        <div className="scenario-title">{scen.name}</div>
                        <div className="scenario-desc">{scen.description}</div>
                      </div>
                      {isActive && <span className="status-indicator simulating"></span>}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </div>

      {toast && (
        <div className={`custom-toast ${toast.type}`}>
          <div style={{ color: toast.type === 'success' ? 'var(--color-accent-green)' : toast.type === 'warning' ? 'var(--color-accent-red)' : 'var(--color-brand)', marginTop: '2px' }}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          </div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-message">{toast.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}

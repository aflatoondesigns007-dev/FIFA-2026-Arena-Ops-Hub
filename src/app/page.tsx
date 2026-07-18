'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Sparkles, 
  ShieldAlert, 
  Send, 
  Bus, 
  Activity, 
  CheckCircle, 
  TrendingUp, 
  Leaf, 
  Clock, 
  Accessibility, 
  Coffee, 
  Volume2, 
  VolumeX,
  Gauge,
  AlertCircle,
  Users
} from 'lucide-react';
import { 
  SCENARIOS, 
  Incident, 
  TransitInfo, 
  getAIConciergeReply,
  DICTIONARY
} from './simulatorData';
import dynamic from 'next/dynamic';

// Dynamically import the heavy SVG map to optimize initial bundle size and speed up first render
const StadiumMap = dynamic(() => import('./StadiumMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
      <span className="status-indicator simulating"></span> Loading Stadium Map overlays...
    </div>
  )
});

interface Message {
  sender: 'bot' | 'user';
  text: string;
}

export default function Home() {
  // --- STATE DECLARATIONS ---
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
  const [lang, setLang] = useState<'en' | 'es' | 'fr'>('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);
  const [fanPoints, setFanPoints] = useState<number>(120); 
  const [audioAnnounce, setAudioAnnounce] = useState<boolean>(false); 

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // --- MEMOIZED SELECTORS (Efficiency) ---
  const d = useMemo(() => DICTIONARY[lang], [lang]);
  const currentMetrics = useMemo(() => SCENARIOS[activeScenario].impactMetrics, [activeScenario]);
  const activeIncident = useMemo(() => incidents.find(inc => inc.id === selectedIncidentId), [incidents, selectedIncidentId]);

  // --- ACTIONS & HANDLERS (useCallback for Optimization) ---
  
  /**
   * Triggers a temporary floating toast warning/success notification.
   */
  const triggerToast = useCallback((title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToast({ title, message, type });
  }, []);

  /**
   * Pushes simulated announcements directly into the user chatbot history feed.
   */
  const pushSystemAlert = useCallback((text: string) => {
    setMessages(prev => [...prev, { sender: 'bot', text }]);
  }, []);

  /**
   * Sends user question to streaming mock LLM chatbot.
   */
  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setIsBotTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, scenario: activeScenario, lang })
      });

      setIsBotTyping(false);

      if (!response.body) {
        const fallback = getAIConciergeReply(text, activeScenario, lang);
        setMessages(prev => [...prev, { sender: 'bot', text: fallback }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamingText = "";

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
      
      if (audioAnnounce && 'speechSynthesis' in window) {
        const spokenText = streamingText.replace(/\*\*|#|♿|🍴/g, '');
        const utterance = new SpeechSynthesisUtterance(spokenText);
        window.speechSynthesis.speak(utterance);
      }

    } catch (e) {
      console.error(e);
      setIsBotTyping(false);
      const fallback = getAIConciergeReply(text, activeScenario, lang);
      setMessages(prev => [...prev, { sender: 'bot', text: fallback }]);
    }
  }, [activeScenario, lang, audioAnnounce]);

  /**
   * Submits active incident details to dispatch planner endpoint to generate briefing instructions.
   */
  const handleGenerateDispatch = useCallback(async (incident: Incident) => {
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
  }, [activeScenario]);

  /**
   * Alters incident status local variables and notifies operators.
   */
  const updateIncidentStatus = useCallback((id: string, newStatus: 'active' | 'dispatched' | 'resolved') => {
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
      triggerToast("Crew Dispatched", `Rapid response unit dispatched to location. ETA: 2 mins.`, 'info');
    } else if (newStatus === 'resolved') {
      triggerToast("Incident Resolved", "Incident has been cleared and logged in database.", 'success');
      setSelectedIncidentId(null);
      setSelectedIncidentPlan('');
    }
  }, [triggerToast]);

  /**
   * Simulates scanning cup and updates fan points wallet.
   */
  const handleScanCup = useCallback(() => {
    setFanPoints(prev => prev + 15);
    triggerToast("Eco-Reward Scanned!", "Thank you for recycling your smart cup. +15 Tournament Points added.", "success");
  }, [triggerToast]);

  // --- EFFECTS ---

  // Sync initial bot greeting with language selection
  useEffect(() => {
    const greetings = {
      en: 'Hello! I am your **FIFA 2026 Arena Concierge**. I can help you with stadium navigation, queue times, transit routes, or accessibility services. Type your question below!',
      es: '¡Hola! Soy tu **Conserje del Estadio FIFA 2026**. Puedo ayudarte con la navegación del estadio, tiempos de espera, transporte o servicios de accesibilidad. ¡Escribe abajo!',
      fr: "Bonjour ! Je suis votre **Concierge de l'Arène FIFA 2026**. Je peux vous aider pour la navigation, le transport ou l'accessibilité. Écrivez ci-dessous !"
    };
    setMessages([
      { sender: 'bot', text: greetings[lang] }
    ]);
  }, [lang]);

  // Sync scenario metrics and auto-trigger alerts
  useEffect(() => {
    const data = SCENARIOS[activeScenario];
    if (data) {
      setIncidents(data.incidentsList.map(inc => ({ ...inc }))); 
      setTransitList(data.transitList);
      setSelectedIncidentId(null);
      setSelectedIncidentPlan('');
      
      triggerToast(`${data.name} Active`, data.description, activeScenario === 'normal' ? 'info' : 'warning');
      
      if (activeScenario === 'rain') {
        pushSystemAlert("🌧️ Heavy Rain Warning: Outdoor transit loops are experiencing delays. Covered walkway overlays are now highlighted on the map.");
      } else if (activeScenario === 'overcrowd') {
        pushSystemAlert("🚨 Crowding Alert: Gate C is extremely congested. Directing traffic to Gates B & D.");
      } else if (activeScenario === 'vip') {
        pushSystemAlert("👑 VIP Convoy: VVIP security corridor active. Some pedestrian access corridors near West Plaza are temporarily closed.");
      }
    }
  }, [activeScenario, triggerToast, pushSystemAlert]);

  // Clear toast notifications timer
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Scroll chat history container
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isBotTyping]);

  return (
    <div className="app-container">
      {/* Accessibility Skip Link */}
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Header */}
      <header className="app-header" role="banner">
        <div className="brand-section">
          <div className="brand-logo-glow" aria-hidden="true">⚽</div>
          <div>
            <h1 className="brand-title">{d.stadiumOps}</h1>
          </div>
          <span className="badge-2026">FIFA World Cup 2026</span>
        </div>

        {/* View controller & current mode indicators */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          
          {/* Language Selector Dropdown */}
          <div className="toggle-views" style={{ marginRight: '4px' }}>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as 'en' | 'es' | 'fr')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                padding: '4px 8px'
              }}
              aria-label="Select Language"
            >
              <option value="en" style={{ background: '#0e1320' }}>🇬🇧 EN</option>
              <option value="es" style={{ background: '#0e1320' }}>🇪🇸 ES</option>
              <option value="fr" style={{ background: '#0e1320' }}>🇫🇷 FR</option>
            </select>
          </div>

          <div className="toggle-views">
            <button 
              type="button"
              className={`toggle-btn ${viewMode === 'fan' ? 'active' : ''}`}
              onClick={() => { setViewMode('fan'); setActiveLayer('heatmap'); }}
              aria-label="Switch to Fan Portal View"
            >
              {d.fanPortal}
            </button>
            <button 
              type="button"
              className={`toggle-btn ${viewMode === 'staff' ? 'active' : ''}`}
              onClick={() => { setViewMode('staff'); setActiveLayer('security'); }}
              aria-label="Switch to Command Center Organizer View"
            >
              {d.commandCenter}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <span className="status-indicator online" aria-hidden="true"></span>
            MetLife Stadium Ops
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="app-body">
        
        {/* Navigation Sidebar */}
        <nav className="sidebar" role="navigation" aria-label="Main Navigation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              {d.navTitle}
            </div>
            <ul className="nav-links">
              <li className="nav-item">
                <button 
                  type="button"
                  className={`nav-btn ${viewMode === 'fan' ? 'active' : ''}`}
                  onClick={() => setViewMode('fan')}
                >
                  <Sparkles size={16} aria-hidden="true" /> {d.fanExp}
                </button>
              </li>
              <li className="nav-item">
                <button 
                  type="button"
                  className={`nav-btn ${viewMode === 'staff' ? 'active' : ''}`}
                  onClick={() => setViewMode('staff')}
                >
                  <Gauge size={16} aria-hidden="true" /> {d.orgDash}
                </button>
              </li>
            </ul>
          </div>

          {/* Environmental Sustainability Sidebar Stats */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-accent-green)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '6px' }}>
              <Leaf size={14} aria-hidden="true" /> {d.greenGoal}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              {d.recyclingTarget}
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }} role="progressbar" aria-valuenow={currentMetrics.sustainabilityScore} aria-valuemin={0} aria-valuemax={100}>
              <div style={{ width: `${currentMetrics.sustainabilityScore}%`, height: '100%', background: 'var(--color-accent-green)' }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {d.current}: {currentMetrics.sustainabilityScore}%
            </div>
          </div>
        </nav>

        {/* Dynamic Main Workspace wrapper */}
        {viewMode === 'fan' ? (
          
          /* ==================================================== */
          /* FAN PORTAL VIEW                                      */
          /* ==================================================== */
          <main id="main-content" className="dashboard-grid" tabIndex={-1} role="main">
            
            {/* Column 1: AI Concierge Assistant */}
            <section className="dashboard-panel" aria-label="AI Concierge Panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Sparkles className="panel-title-icon" size={18} style={{ color: 'var(--color-accent-purple)' }} aria-hidden="true" />
                  <h2 className="panel-title">{d.aiAssistant}</h2>
                </div>
                <button 
                  type="button"
                  onClick={() => setAudioAnnounce(prev => !prev)}
                  style={{ background: 'none', border: 'none', color: audioAnnounce ? 'var(--color-accent-purple)' : 'var(--text-muted)', cursor: 'pointer' }}
                  title="Toggle Audio Readback for Accessibility"
                  aria-label="Toggle Audio Voice Readback"
                >
                  {audioAnnounce ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
              </div>

              <div className="chat-container">
                <div className="chat-history" aria-live="polite">
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
                  {lang === 'es' ? (
                    <>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("¿Dónde está el ascensor ADA más cercano?")}>♿ Rampas y Ascensores</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("¿Cómo llego al transporte público?")}>🚆 Rutas de Tránsito</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("¿Dónde está la sección de comida?")}>🍴 Concesiones de Comida</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("¿Cómo funciona el reciclaje aquí?")}>♻️ Recompensas de Reciclaje</button>
                    </>
                  ) : lang === 'fr' ? (
                    <>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("Où se trouve l'ascenseur ADA le plus proche ?")}>♿ Rampes et Ascenseurs</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("Comment accéder aux transports publics ?")}>🚆 Transports Publics</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("Où se trouve la zone de restauration ?")}>🍴 Restauration & Stands</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("Comment recycler mon gobelet ?")}>♻️ Points de Recyclage</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("Where is the nearest ADA elevator?")}>♿ ADA Ramps & Elevators</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("How do I get to public transit after the match?")}>🚆 Public Transit Routes</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("Where is the food section?")}>🍴 Food Concessions</button>
                      <button type="button" className="quick-q-btn" onClick={() => handleSendMessage("How does recycling work here?")}>♻️ Sustainability Cup rewards</button>
                    </>
                  )}
                </div>

                <div className="chat-input-area">
                  <input 
                    type="text" 
                    className="chat-input" 
                    placeholder={lang === 'es' ? "Pregunta sobre transporte, accesibilidad, comida..." : lang === 'fr' ? "Poser une question sur le transport, l'accessibilité..." : "Ask about gates, transit, food, sensory rooms..."} 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(chatInput)}
                    aria-label="Chat input query"
                  />
                  <button type="button" className="chat-send-btn" onClick={() => handleSendMessage(chatInput)} aria-label="Send message">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </section>

            {/* Column 2: Interactive SVG Stadium Map */}
            <section className="dashboard-panel" aria-label="Interactive Stadium Map">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Activity className="panel-title-icon" size={18} aria-hidden="true" />
                  <h2 className="panel-title">{d.arenaMap}</h2>
                </div>
              </div>

              {/* Map Canvas */}
              <div style={{ flex: 1, position: 'relative' }}>
                <StadiumMap
                  activeLayer={activeLayer}
                  incidents={incidents}
                  selectedIncidentId={null}
                  onSelectIncident={() => {}}
                  densityOverrides={SCENARIOS[activeScenario].mapDensityOverrides}
                />

                {/* Floater Filters */}
                <div className="map-controls-floating" role="group" aria-label="Map filter layers">
                  <button 
                    type="button"
                    className={`map-layer-btn ${activeLayer === 'heatmap' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('heatmap')}
                    title="Crowd Heatmap"
                    aria-label="Show Crowd Density Heatmap"
                  >
                    <Users size={16} />
                  </button>
                  <button 
                    type="button"
                    className={`map-layer-btn ${activeLayer === 'amenities' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('amenities')}
                    title="Food & Amenities"
                    aria-label="Show concessions and restrooms"
                  >
                    <Coffee size={16} />
                  </button>
                  <button 
                    type="button"
                    className={`map-layer-btn ${activeLayer === 'accessibility' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('accessibility')}
                    title="Accessibility Guides"
                    aria-label="Show ADA ramps and elevators"
                  >
                    <Accessibility size={16} />
                  </button>
                  <button 
                    type="button"
                    className={`map-layer-btn ${activeLayer === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('security')}
                    title="Gates & Security"
                    aria-label="Show gates and security lanes"
                  >
                    <ShieldAlert size={16} />
                  </button>
                </div>

                {/* Map Legends */}
                <div className="map-legend" role="presentation">
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
            </section>

            {/* Column 3: Live Transit & Sustainability Widget */}
            <section className="dashboard-panel" aria-label="Transit and Sustainability Widget">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Bus className="panel-title-icon" size={18} aria-hidden="true" />
                  <h2 className="panel-title">{d.transitHub}</h2>
                </div>
              </div>

              {/* Dynamic transit status board */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {d.travelSchedules}
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
                        {transit.waitingTime} ({transit.status.toUpperCase()})
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
                    <Leaf size={16} aria-hidden="true" /> {d.ecoCupTitle}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '12px' }}>
                    {d.ecoCupDesc}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.greenPoints}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white' }}>{fanPoints} pts</div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleScanCup}
                    style={{ background: 'var(--color-accent-green)', border: 'none', padding: '6px 12px', color: 'white', fontWeight: 600, fontSize: '0.75rem', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    {d.scanBtn}
                  </button>
                </div>
              </div>
            </section>

          </main>
        ) : (
          
          /* ==================================================== */
          /* ORGANIZERS & STAFF COMMAND CENTER                    */
          /* ==================================================== */
          <main id="main-content" className="dashboard-grid" tabIndex={-1} role="main" style={{ alignContent: 'start' }}>
            
            {/* GenAI Dynamic Decision Support Banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(59, 130, 246, 0.08))',
              border: '1px solid rgba(168, 85, 247, 0.3)',
              borderRadius: '12px',
              padding: '14px 18px',
              gridColumn: 'span 3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              boxShadow: '0 4px 20px rgba(168, 85, 247, 0.15)',
              animation: 'slideUp 0.4s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'var(--color-accent-purple)', padding: '8px', borderRadius: '8px', color: 'white', boxShadow: '0 0 15px rgba(168, 85, 247, 0.5)' }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', fontFamily: 'var(--font-display)' }}>
                    GenAI Live Decision Assistant
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                    {activeScenario === 'normal' && (lang === 'es' ? "Operaciones estables. El clima está despejado y el flujo es constante. No se requiere intervención inmediata." : lang === 'fr' ? "Opérations stables. Le ciel est dégagé et le flux est régulier. Aucune intervention requise." : "Operations stable. Weather is clear and crowd flow is steady. No immediate intervention required.")}
                    {activeScenario === 'rain' && (lang === 'es' ? "⚠️ Clima adverso detectado. Afluencia alta en pasillos cubiertos. Se aconseja desviar a los fanáticos y desplegar alfombras." : lang === 'fr' ? "⚠️ Conditions météo défavorables. Fortes densités dans les passages couverts. Conseillez des itinéraires abrités." : "⚠️ Adverse weather detected. High densities in covered concourses. Advise rerouting fans to covered pathways and deploying safety materials.")}
                    {activeScenario === 'overcrowd' && (lang === 'es' ? "🚨 Saturación en Puerta C (48m). Recomiende a los fanáticos dirigirse a las Puertas B o D para agilizar el ingreso." : lang === 'fr' ? "🚨 Embouteillage à la Porte C (48m). Redirigez les flux vers les Portes B ou D pour désengorger l'accès." : "🚨 Congestion spike at Gate C (48m). Guide incoming visitor shuttles to drop off at Gates B or D to balance loads.")}
                    {activeScenario === 'vip' && (lang === 'es' ? "👑 Protocolo de seguridad VVIP activo. Corredor Sur asegurado. Monitoree las puertas occidentales para evitar retenciones." : lang === 'fr' ? "👑 Protocole de sécurité VVIP activé. Couloir Sud sécurisé. Surveillez les entrées Ouest pour éviter les goulots d'étranglement." : "👑 VVIP security protocol active. Southern corridor cleared. Monitor west gates for pedestrian congestion.")}
                  </p>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-accent-purple)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', border: '1px solid rgba(168, 85, 247, 0.4)', padding: '4px 8px', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.05)' }}>
                Real-Time Advice
              </div>
            </div>

            {/* Column 1: Live Analytics & Incident Dispatcher */}
            <section className="dashboard-panel" aria-label="Incident Management Logs">
              <div className="panel-header">
                <div className="panel-title-group">
                  <ShieldAlert className="panel-title-icon" size={18} style={{ color: 'var(--color-accent-red)' }} aria-hidden="true" />
                  <h2 className="panel-title">{d.activeIncidents}</h2>
                </div>
                <span style={{ fontSize: '0.75rem', background: 'rgba(244,63,94,0.1)', color: 'var(--color-accent-red)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                  {incidents.filter(i => i.status !== 'resolved').length} {d.activeAlerts}
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Incident: ${incident.title} at ${incident.location}`}
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
                    {d.incidentDescTitle}
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
                        type="button"
                        className="dispatch-btn primary"
                        onClick={() => handleGenerateDispatch(activeIncident)}
                        style={{ background: 'var(--color-accent-purple)' }}
                      >
                        <Sparkles size={12} aria-hidden="true" /> {d.aiDispatchBtn}
                      </button>
                    )}
                    
                    {activeIncident.status === 'active' && (
                      <button 
                        type="button"
                        className="dispatch-btn primary"
                        onClick={() => updateIncidentStatus(activeIncident.id, 'dispatched')}
                      >
                        {d.dispatchBtn}
                      </button>
                    )}

                    {activeIncident.status === 'dispatched' && (
                      <button 
                        type="button"
                        className="dispatch-btn primary"
                        onClick={() => updateIncidentStatus(activeIncident.id, 'resolved')}
                        style={{ background: 'var(--color-accent-green)' }}
                      >
                        {d.resolveBtn}
                      </button>
                    )}
                    
                    <button 
                      type="button"
                      className="nav-btn"
                      style={{ padding: '4px 8px', fontSize: '0.75rem', textAlign: 'center', width: 'auto' }}
                      onClick={() => { setSelectedIncidentId(null); setSelectedIncidentPlan(''); }}
                    >
                      {d.cancelBtn}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', padding: '20px', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                  {d.selectIncidentHelper}
                </div>
              )}
            </section>

            {/* Column 2: Interactive SVG Stadium Map for Staff */}
            <section className="dashboard-panel" aria-label="Operations Stadium Map Control">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Activity className="panel-title-icon" size={18} aria-hidden="true" />
                  <h2 className="panel-title">{d.arenaMap}</h2>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    type="button"
                    className={`toggle-btn ${activeLayer === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveLayer('security')}
                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                  >
                    Gates
                  </button>
                  <button 
                    type="button"
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
            </section>

            {/* Column 3: Live Arena Operations Stats & Simulator */}
            <section className="dashboard-panel" aria-label="Arena Operations Control Panel">
              <div className="panel-header">
                <div className="panel-title-group">
                  <Clock className="panel-title-icon" size={18} aria-hidden="true" />
                  <h2 className="panel-title">{d.opsControl}</h2>
                </div>
              </div>

              {/* Simulation metrics */}
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-label">{d.avgGateWait}</span>
                  <span className="stat-val">{currentMetrics.avgGateWait}</span>
                  <span className="stat-trend down">
                    <TrendingUp size={10} aria-hidden="true" /> {d.liveFlow}
                  </span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">{d.crowdIndex}</span>
                  <span className="stat-val">{currentMetrics.crowdIndex}%</span>
                  <span className="stat-trend up">
                    {d.steadyFlow}
                  </span>
                </div>
              </div>

              {/* Interactive Scenario Trigger System */}
              <div className="simulator-panel" style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                  {d.scenarioSimulator}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  {d.simulatorDesc}
                </p>

                {Object.keys(SCENARIOS).map((key) => {
                  const scen = SCENARIOS[key];
                  const isActive = activeScenario === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      className={`scenario-button ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveScenario(key)}
                    >
                      <div>
                        <div className="scenario-title">{scen.name}</div>
                        <div className="scenario-desc">{scen.description}</div>
                      </div>
                      {isActive && <span className="status-indicator simulating" aria-hidden="true"></span>}
                    </button>
                  );
                })}
              </div>
            </section>

          </main>
        )}

      </div>

      {/* Floating custom glassmorphic Toast notification */}
      {toast && (
        <div className={`custom-toast ${toast.type}`} role="alert" aria-live="assertive">
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

'use client';

import React, { useState } from 'react';
import { Incident } from './simulatorData';
import { HelpCircle, Info, Accessibility, Coffee, ShieldAlert, Sparkles } from 'lucide-react';

interface StadiumMapProps {
  activeLayer: 'heatmap' | 'amenities' | 'accessibility' | 'security';
  incidents: Incident[];
  selectedIncidentId: string | null;
  onSelectIncident: (id: string) => void;
  densityOverrides: { [zoneId: string]: 'low' | 'medium' | 'high' };
}

export default function StadiumMap({
  activeLayer,
  incidents,
  selectedIncidentId,
  onSelectIncident,
  densityOverrides
}: StadiumMapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string; visible: boolean }>({
    x: 0,
    y: 0,
    text: '',
    visible: false
  });

  const zones = [
    { id: 'zone-a', name: 'Zone A (North Deck)', path: 'M 100,80 Q 200,20 300,80 L 280,120 Q 200,80 120,120 Z' },
    { id: 'zone-b', name: 'Zone B (East Plaza & VIP)', path: 'M 300,80 Q 380,200 300,320 L 280,280 Q 340,200 280,120 Z' },
    { id: 'zone-c', name: 'Zone C (South Deck)', path: 'M 300,320 Q 200,380 100,320 L 120,280 Q 200,320 280,280 Z' },
    { id: 'zone-d', name: 'Zone D (West Deck)', path: 'M 100,320 Q 20,200 100,80 L 120,120 Q 60,200 120,280 Z' },
    { id: 'zone-e', name: 'Zone E (Inner Suites & Club)', path: 'M 120,130 Q 200,90 280,130 Q 320,200 280,270 Q 200,310 120,270 Q 80,200 120,130 Z' }
  ];

  const handleZoneHover = (e: React.MouseEvent, zoneName: string, zoneId: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const density = densityOverrides[zoneId] || 'low';
    const densityText = density === 'high' ? 'High Congestion (Delay)' : density === 'medium' ? 'Moderate Crowds' : 'Clear / Fast';
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 40,
      text: `${zoneName} - Status: ${densityText}`,
      visible: true
    });
  };

  const handleNodeHover = (e: React.MouseEvent, name: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2,
      y: rect.top - 45,
      text: name,
      visible: true
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  return (
    <div className="map-canvas-container" style={{ width: '100%', height: '100%', minHeight: '380px' }}>
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full max-h-[500px]"
        style={{ background: 'transparent' }}
        aria-labelledby="stadium-map-title stadium-map-desc"
        role="application"
      >
        <title id="stadium-map-title">Interactive MetLife Arena Map</title>
        <desc id="stadium-map-desc">MetLife Stadium layout highlighting crowd heatmaps, accessible elevators, sensory rooms, security gates, and concessions.</desc>
        
        {/* Gradients */}
        <defs>
          <radialGradient id="stadiumGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#07090e" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Backdrop Ambient Light */}
        <rect width="400" height="400" fill="url(#stadiumGlow)" aria-hidden="true" />

        {/* Stadium Outer Ring */}
        <ellipse cx="200" cy="200" rx="175" ry="175" fill="none" stroke="#1e293b" strokeWidth="6" opacity="0.6" aria-hidden="true" />
        <ellipse cx="200" cy="200" rx="180" ry="180" fill="none" stroke="#334155" strokeWidth="1" opacity="0.4" aria-hidden="true" />

        {/* Pitch / Field */}
        <rect x="155" y="145" width="90" height="110" rx="4" className="stadium-pitch" aria-label="Soccer field playing pitch" role="img" />
        {/* Field Markings */}
        <ellipse cx="200" cy="200" rx="18" ry="18" fill="none" stroke="#2e7d32" strokeWidth="1" aria-hidden="true" />
        <line x1="155" y1="200" x2="245" y2="200" stroke="#2e7d32" strokeWidth="1" aria-hidden="true" />
        {/* Penalty boxes */}
        <rect x="180" y="145" width="40" height="15" fill="none" stroke="#2e7d32" strokeWidth="1" aria-hidden="true" />
        <rect x="180" y="240" width="40" height="15" fill="none" stroke="#2e7d32" strokeWidth="1" aria-hidden="true" />

        {/* Seating Zones */}
        {zones.map((zone) => {
          const density = densityOverrides[zone.id] || 'low';
          let zoneClass = 'stadium-zone';
          
          if (activeLayer === 'heatmap') {
            zoneClass += ` density-${density}`;
          }

          return (
            <path
              key={zone.id}
              d={zone.path}
              className={zoneClass}
              role="region"
              aria-label={`${zone.name}. Crowd flow: ${density}`}
              tabIndex={0}
              onMouseEnter={(e) => handleZoneHover(e, zone.name, zone.id)}
              onMouseLeave={hideTooltip}
              style={{
                transition: 'fill 0.4s ease, stroke 0.2s ease',
                stroke: activeLayer === 'heatmap' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'
              }}
            />
          );
        })}

        {/* AMENITIES LAYER (🍴) */}
        {activeLayer === 'amenities' && (
          <g aria-label="Concessions and Restrooms Layer">
            {/* Food stands */}
            <circle cx="160" cy="105" r="7" className="map-node concession" role="button" tabIndex={0} aria-label="World Cup Grill (Section 114)" onMouseEnter={(e) => handleNodeHover(e, "World Cup Grill (Section 114)")} onMouseLeave={hideTooltip} />
            <circle cx="240" cy="105" r="7" className="map-node concession" role="button" tabIndex={0} aria-label="Merchandise Superstore (Section 118)" onMouseEnter={(e) => handleNodeHover(e, "Merchandise Superstore (Section 118)")} onMouseLeave={hideTooltip} />
            <circle cx="95" cy="230" r="7" className="map-node concession" role="button" tabIndex={0} aria-label="Taco Arena (Section 132)" onMouseEnter={(e) => handleNodeHover(e, "Taco Arena (Section 132)")} onMouseLeave={hideTooltip} />
            <circle cx="305" cy="230" r="7" className="map-node concession" role="button" tabIndex={0} aria-label="Beverage Station (Section 148)" onMouseEnter={(e) => handleNodeHover(e, "Beverage Station (Section 148)")} onMouseLeave={hideTooltip} />
            
            {/* Restrooms */}
            <circle cx="110" cy="95" r="7" className="map-node restroom" role="button" tabIndex={0} aria-label="Restrooms (Section 108)" onMouseEnter={(e) => handleNodeHover(e, "Restrooms Male/Female (Section 108)")} onMouseLeave={hideTooltip} />
            <circle cx="290" cy="95" r="7" className="map-node restroom" role="button" tabIndex={0} aria-label="Restrooms (Section 122)" onMouseEnter={(e) => handleNodeHover(e, "Restrooms Male/Female (Section 122)")} onMouseLeave={hideTooltip} />
            <circle cx="110" cy="305" r="7" className="map-node restroom" role="button" tabIndex={0} aria-label="Restrooms (Section 136)" onMouseEnter={(e) => handleNodeHover(e, "Restrooms Male/Female (Section 136)")} onMouseLeave={hideTooltip} />
            <circle cx="290" cy="305" r="7" className="map-node restroom" role="button" tabIndex={0} aria-label="Restrooms (Section 150)" onMouseEnter={(e) => handleNodeHover(e, "Restrooms Male/Female (Section 150)")} onMouseLeave={hideTooltip} />
          </g>
        )}

        {/* ACCESSIBILITY LAYER (♿) */}
        {activeLayer === 'accessibility' && (
          <g aria-label="ADA Facilities and Ramps Layer">
            {/* Wheelchair accessible ramps */}
            <circle cx="85" cy="130" r="7" className="map-node ramp" role="img" tabIndex={0} aria-label="Wheelchair Ramp West Entrance" onMouseEnter={(e) => handleNodeHover(e, "Wheelchair Ramp West Entrance")} onMouseLeave={hideTooltip} />
            <circle cx="315" cy="130" r="7" className="map-node ramp" role="img" tabIndex={0} aria-label="Wheelchair Ramp East Entrance" onMouseEnter={(e) => handleNodeHover(e, "Wheelchair Ramp East Entrance")} onMouseLeave={hideTooltip} />
            
            {/* Elevators */}
            <circle cx="130" cy="115" r="7" className="map-node ramp" style={{ fill: '#3b82f6' }} role="img" tabIndex={0} aria-label="ADA Main Elevator (Section 104)" onMouseEnter={(e) => handleNodeHover(e, "ADA Main Elevator (Section 104)")} onMouseLeave={hideTooltip} />
            <circle cx="270" cy="115" r="7" className="map-node ramp" style={{ fill: '#3b82f6' }} role="img" tabIndex={0} aria-label="ADA Elevator East (Section 124)" onMouseEnter={(e) => handleNodeHover(e, "ADA Elevator East (Section 124)")} onMouseLeave={hideTooltip} />
            
            {/* Sensory Room */}
            <g role="img" tabIndex={0} aria-label="Sensory Room (Quiet Space - Section 112)">
              <circle cx="110" cy="220" r="8" className="map-node ramp" style={{ fill: '#a855f7' }} onMouseEnter={(e) => handleNodeHover(e, "Sensory Room (Quiet Space - Section 112)")} onMouseLeave={hideTooltip} />
              <text x="110" y="223" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold" pointerEvents="none">S</text>
            </g>
          </g>
        )}

        {/* SECURITY & GATES LAYER */}
        {activeLayer === 'security' && (
          <g aria-label="Gates and Security Entrances Layer">
            {/* Gate Entrance Indicators */}
            <g role="button" tabIndex={0} aria-label="Gate A Main North Entrance" onMouseEnter={(e) => handleNodeHover(e, "Gate A (Main North Entrance)")} onMouseLeave={hideTooltip}>
              <circle cx="200" cy="30" r="9" className="map-node gate" />
              <text x="200" y="33" textAnchor="middle" fontSize="8" fill="#07090e" fontWeight="800" pointerEvents="none">A</text>
            </g>

            <g role="button" tabIndex={0} aria-label="Gate B East VIP Entrance" onMouseEnter={(e) => handleNodeHover(e, "Gate B (East VIP Entrance)")} onMouseLeave={hideTooltip}>
              <circle cx="370" cy="200" r="9" className="map-node gate" />
              <text x="370" y="203" textAnchor="middle" fontSize="8" fill="#07090e" fontWeight="800" pointerEvents="none">B</text>
            </g>

            <g role="button" tabIndex={0} aria-label="Gate C South Transit Loop Entrance" onMouseEnter={(e) => handleNodeHover(e, "Gate C (South Transit Loop Entrance)")} onMouseLeave={hideTooltip}>
              <circle cx="200" cy="370" r="9" className="map-node gate" />
              <text x="200" y="373" textAnchor="middle" fontSize="8" fill="#07090e" fontWeight="800" pointerEvents="none">C</text>
            </g>

            <g role="button" tabIndex={0} aria-label="Gate D West Parking Entrance" onMouseEnter={(e) => handleNodeHover(e, "Gate D (West Parking Entrance)")} onMouseLeave={hideTooltip}>
              <circle cx="30" cy="200" r="9" className="map-node gate" />
              <text x="30" y="203" textAnchor="middle" fontSize="8" fill="#07090e" fontWeight="800" pointerEvents="none">D</text>
            </g>
          </g>
        )}

        {/* ACTIVE INCIDENTS (Superimposed on all layers for Staff) */}
        {incidents.map((incident) => {
          if (incident.status === 'resolved') return null;
          const isSelected = selectedIncidentId === incident.id;
          const handleKey = (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              onSelectIncident(incident.id);
            }
          };
          return (
            <g 
              key={incident.id} 
              className="map-node incident" 
              onClick={() => onSelectIncident(incident.id)} 
              onKeyDown={handleKey}
              style={{ cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-label={`Incident Alert: ${incident.title} at ${incident.location}`}
            >
              <circle
                cx={incident.lng}
                cy={incident.lat}
                r={isSelected ? 10 : 7}
                style={{
                  fill: incident.priority === 'high' ? '#f43f5e' : incident.priority === 'medium' ? '#f59e0b' : '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: isSelected ? '2px' : '1px'
                }}
                onMouseEnter={(e) => handleNodeHover(e, `${incident.title} (${incident.location}) - Alert!`)}
                onMouseLeave={hideTooltip}
              />
              {/* Inner dot */}
              <circle
                cx={incident.lng}
                cy={incident.lat}
                r="3"
                fill="#ffffff"
                pointerEvents="none"
              />
            </g>
          );
        })}
      </svg>

      {/* Dynamic Floating Tooltip */}
      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translateX(-50%)',
            background: 'rgba(9, 13, 22, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#f8fafc',
            pointerEvents: 'none',
            zIndex: 100,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

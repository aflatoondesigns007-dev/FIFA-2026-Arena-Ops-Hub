export interface Incident {
  id: string;
  title: string;
  location: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'dispatched' | 'resolved';
  time: string;
  description: string;
  volunteerAssigned?: string;
  aiRecommendation: string;
  lat: number; // For map marker placement
  lng: number;
}

export interface TransitInfo {
  name: string;
  type: 'rail' | 'shuttle' | 'rideshare' | 'parking';
  status: 'normal' | 'delayed' | 'crowded' | 'suspended';
  waitingTime: string;
  summary: string;
}

export interface ScenarioData {
  name: string;
  description: string;
  impactMetrics: {
    activeIncidents: number;
    avgGateWait: string;
    crowdIndex: number;
    sustainabilityScore: number;
  };
  mapDensityOverrides: { [zoneId: string]: 'low' | 'medium' | 'high' };
  incidentsList: Incident[];
  transitList: TransitInfo[];
}

export const INITIAL_TRANSIT: TransitInfo[] = [
  { name: "MetLife Express Rail", type: "rail", status: "normal", waitingTime: "12m", summary: "Trains running every 10 minutes to NY Penn Station." },
  { name: "Tournament Shuttle Loop", type: "shuttle", status: "normal", waitingTime: "4m", summary: "Continuous loop between parking lots A, B, and G." },
  { name: "Main Rideshare Plaza", type: "rideshare", status: "crowded", waitingTime: "18m", summary: "High demand. Dynamic pricing active." },
  { name: "Lot C Accessible Shuttle", type: "shuttle", status: "normal", waitingTime: "5m", summary: "ADA accessible direct shuttle service to Gate A." }
];

export const INITIAL_INCIDENTS: Incident[] = [
  {
    id: "INC-101",
    title: "Liquid Spill",
    location: "Section 114 Corridor",
    priority: "medium",
    status: "active",
    time: "15:40",
    description: "Large soda spill near concession stand B-4. Creating a slipping hazard.",
    aiRecommendation: "Dispatch volunteer crew with wet-floor sign and mop. Guide visually impaired fans to the bypass corridor via secondary audio wayfinding.",
    lat: 160,
    lng: 140
  },
  {
    id: "INC-102",
    title: "Wheelchair Lock Malfunction",
    location: "ADA Row 204",
    priority: "low",
    status: "active",
    time: "15:42",
    description: "Fan's wheelchair brake is jammed. Needs assistance resetting lock or providing a spare.",
    aiRecommendation: "Assign Accessibility Coordinator (Volunteer Clara). Dispatch replacement standard transit wheelchair from main locker room.",
    lat: 280,
    lng: 180
  }
];

export const SCENARIOS: { [key: string]: ScenarioData } = {
  normal: {
    name: "Standard Tournament Ops",
    description: "Default operations. Sunny weather, steady crowd flow, transit running on time.",
    impactMetrics: {
      activeIncidents: 2,
      avgGateWait: "12 mins",
      crowdIndex: 65,
      sustainabilityScore: 88
    },
    mapDensityOverrides: {
      "zone-a": "medium",
      "zone-b": "low",
      "zone-c": "medium",
      "zone-d": "low",
      "zone-e": "low"
    },
    incidentsList: INITIAL_INCIDENTS,
    transitList: INITIAL_TRANSIT
  },
  rain: {
    name: "Heavy Rainstorm",
    description: "Heavy rain starting. Fans crowd under roofs and concourses. Transit delays expected.",
    impactMetrics: {
      activeIncidents: 4,
      avgGateWait: "24 mins",
      crowdIndex: 82,
      sustainabilityScore: 79
    },
    mapDensityOverrides: {
      "zone-a": "high", // Gate A gets crowded as it is covered
      "zone-b": "medium",
      "zone-c": "high", // concourses crowded
      "zone-d": "medium",
      "zone-e": "low"
    },
    incidentsList: [
      ...INITIAL_INCIDENTS,
      {
        id: "INC-103",
        title: "Slippery Walkway",
        location: "Gate C Outer Pathway",
        priority: "high",
        status: "active",
        time: "15:52",
        description: "Heavy rain accumulating at walkway. Risk of falls as crowds rush in.",
        aiRecommendation: "Deploy outdoor rubber floor matting immediately. Broadcast audio alert: 'Please walk slow on outdoor tiles. Use covered pathways.'",
        lat: 120,
        lng: 280
      },
      {
        id: "INC-104",
        title: "Concourse Congested",
        location: "Main Concourse - West",
        priority: "medium",
        status: "active",
        time: "15:53",
        description: "Fans seeking shelter from rain block exit pathways. Fire escape hazard.",
        aiRecommendation: "Direct volunteers to guide fans to empty covered seating. Activate dynamic digital signs to show open sensory and indoor lounge spaces.",
        lat: 220,
        lng: 110
      }
    ],
    transitList: [
      { name: "MetLife Express Rail", type: "rail", status: "delayed", waitingTime: "25m", summary: "Weather delays. Speed restrictions on northeast corridor." },
      { name: "Tournament Shuttle Loop", type: "shuttle", status: "crowded", waitingTime: "10m", summary: "Reduced visibility. Extra buses deployed." },
      { name: "Main Rideshare Plaza", type: "rideshare", status: "suspended", waitingTime: "--", summary: "Suspended. Rideshare plaza flooded, please use light rail." },
      { name: "Lot C Accessible Shuttle", type: "shuttle", status: "normal", waitingTime: "6m", summary: "ADA shuttle running covered route to Gate A." }
    ]
  },
  overcrowd: {
    name: "Gate C Queue Surge",
    description: "Gate C experiences 250% surge due to localized subway dropoffs. Wait times spiking.",
    impactMetrics: {
      activeIncidents: 3,
      avgGateWait: "48 mins",
      crowdIndex: 94,
      sustainabilityScore: 85
    },
    mapDensityOverrides: {
      "zone-a": "low",
      "zone-b": "low",
      "zone-c": "high", // Gate C heavily crowded
      "zone-d": "high",
      "zone-e": "low"
    },
    incidentsList: [
      ...INITIAL_INCIDENTS,
      {
        id: "INC-105",
        title: "Queue Overrun",
        location: "Gate C Screening Lanes",
        priority: "high",
        status: "active",
        time: "15:54",
        description: "Queue barriers starting to fall. Tempers flaring among fans.",
        aiRecommendation: "Deploy crowd management team A-2 to form secondary barrier. Broadcast push message: 'Gate C congested (48m). Gate B (5m) is open.'",
        lat: 110,
        lng: 290
      }
    ],
    transitList: [
      { name: "MetLife Express Rail", type: "rail", status: "normal", waitingTime: "8m", summary: "Running frequently to clear subway backlog." },
      { name: "Tournament Shuttle Loop", type: "shuttle", status: "normal", waitingTime: "4m", summary: "Rerouting shuttle buses to dump at Gate B." },
      { name: "Main Rideshare Plaza", type: "rideshare", status: "crowded", waitingTime: "22m", summary: "High pickup density at rideshare terminal 2." },
      { name: "Lot C Accessible Shuttle", type: "shuttle", status: "normal", waitingTime: "5m", summary: "ADA shuttles rerouted via gate D." }
    ]
  },
  vip: {
    name: "VIP/VVIP Arrival",
    description: "Dignitaries arriving at South VIP Entrance. Security protocol active.",
    impactMetrics: {
      activeIncidents: 3,
      avgGateWait: "14 mins",
      crowdIndex: 72,
      sustainabilityScore: 87
    },
    mapDensityOverrides: {
      "zone-a": "medium",
      "zone-b": "high", // VIP gate crowded
      "zone-c": "low",
      "zone-d": "low",
      "zone-e": "medium"
    },
    incidentsList: [
      ...INITIAL_INCIDENTS,
      {
        id: "INC-106",
        title: "VIP Convoy Clearway",
        location: "VVIP Tunnel 2",
        priority: "medium",
        status: "active",
        time: "15:55",
        description: "Convoy arriving. Pedestrian crossway needs temporary hold.",
        aiRecommendation: "Activate strobe warning lights. Volunteers to clear VVIP tunnel access route. Delay secondary ticket line B for 3 minutes.",
        lat: 250,
        lng: 320
      }
    ],
    transitList: INITIAL_TRANSIT
  }
};

export const MOCK_BOT_REPLIES: { keywords: string[]; response: string }[] = [
  {
    keywords: ["hi", "hello", "hey", "start"],
    response: "Hello! I am your **FIFA 2026 Arena Concierge**. I can help you with stadium navigation, crowd status, accessibility resources, or transport options. How can I assist you today?"
  },
  {
    keywords: ["gate", "entrance", "find my gate", "where to enter"],
    response: "You can find your gate printed on your mobile ticket. Normally, **Gate A** serves Sections 101-120, **Gate B** serves 121-140, and **Gate C** serves 141-160. Check the interactive map on your screen to find the exact gate position and queue times!"
  },
  {
    keywords: ["rain", "weather", "wet", "umbrella"],
    response: "Umbrellas are **not permitted** inside the seating bowl. However, rain ponchos are available at any merchandise stand. If it starts raining, please utilize covered concourse routes indicated in **green** on your map."
  },
  {
    keywords: ["wheelchair", "accessible", "ada", "ramp", "elevator", "disability"],
    response: "MetLife Stadium is fully ADA compliant. All gates have wheelchair accessible ramps. **Elevators** are located near Sections 104, 124, and 144. You can toggle the **Accessibility Layer (♿)** on your map to view wheelchair routes, restrooms, and sensory rooms."
  },
  {
    keywords: ["food", "water", "beer", "concession", "eat", "hot dog"],
    response: "Concessions are scattered throughout all levels. Try the **World Cup Grill** (Sec 116) or **Taco Arena** (Sec 132). You can locate the closest concession on your map by toggling the **Amenities Layer (🍴)**."
  },
  {
    keywords: ["transit", "train", "shuttle", "bus", "rideshare", "subway", "go home", "leave"],
    response: "For outbound travel, **MetLife Express Rail** leaves from the station located directly in front of Gate A. Shuttles to parking lot G leave from Gate B. Rideshare pickup is located at **Rideshare Plaza 1**. Check our **Live Transit Planner** widget on this page for current wait times!"
  },
  {
    keywords: ["recycle", "green", "sustainability", "eco", "waste", "trash"],
    response: "Let's make FIFA 2026 the greenest World Cup! Please separate your trash: **Blue bins** for plastics & cans, and **Green bins** for compostable food trays. Thank you for scanning your cup to earn rewards!"
  }
];

export const getAIConciergeReply = (query: string, activeScenario: string): string => {
  const q = query.toLowerCase();
  
  // Specific scenario updates in replies
  if (activeScenario === 'rain') {
    if (q.includes('train') || q.includes('rail') || q.includes('transit') || q.includes('leave')) {
      return "⚠️ **Alert:** Due to heavy rain, the **MetLife Express Rail** is experiencing delays of approximately 25 minutes. Rideshares are temporarily suspended at the plaza. We recommend sheltering in the covered West Concourse or taking the Lot C Shuttle.";
    }
    if (q.includes('crowd') || q.includes('busy') || q.includes('congested')) {
      return "⚠️ **Heavy Rain Update:** Concourses on the West and Gate A are currently high-density. We suggest using Gate D/E or waiting inside the covered lounge areas until crowd levels disperse.";
    }
  }

  if (activeScenario === 'overcrowd') {
    if (q.includes('gate c') || q.includes('queue') || q.includes('wait')) {
      return "⚠️ **Gate C Warning:** Queue wait times at Gate C are currently **48 minutes**. Please reroute to **Gate B** (5 min wait) or **Gate D** (8 min wait). Scan the map to find direct pedestrian bypass lanes.";
    }
  }

  // General check
  for (const item of MOCK_BOT_REPLIES) {
    if (item.keywords.some(k => q.includes(k))) {
      return item.response;
    }
  }

  return "I'm not sure about that. Try asking about 'accessible routes', 'gate queues', 'train schedules', or 'merchandise & food'. You can also view details on the interactive map layers!";
};

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { incident, scenario } = await req.json();
    
    if (!incident || typeof incident !== 'object') {
      return NextResponse.json({ error: "Invalid incident data" }, { status: 400 });
    }
    
    if (!incident.title || !incident.location || !incident.priority) {
      return NextResponse.json({ error: "Missing required incident fields" }, { status: 400 });
    }

    const escapeHtmlStr = (str: string) => str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    const sanitizedTitle = escapeHtmlStr(String(incident.title).trim().slice(0, 200));
    const sanitizedLocation = escapeHtmlStr(String(incident.location).trim().slice(0, 200));
    const sanitizedPriority = escapeHtmlStr(String(incident.priority).trim().slice(0, 50));

    // Dynamic GenAI operational analysis
    let crew = "General Operations Crew - Zone " + sanitizedLocation.charAt(0);
    let priorityCode = sanitizedPriority.toUpperCase();
    let eta = "4-6 minutes";
    let accessibilityBrief = "";
    let specialWarning = "";

    // Generate specific recommendations based on scenario and incident details
    if (sanitizedPriority.toLowerCase() === 'high') {
      crew = "Rapid Response Team Alpha (RRT-A)";
      eta = "1-3 minutes";
    }

    if (sanitizedTitle.toLowerCase().includes("wheelchair") || sanitizedLocation.includes("ADA")) {
      crew = "Accessibility Assistance Team (Coordinator Clara + Lead Support)";
      eta = "2-4 minutes";
      accessibilityBrief = "\n*   **Accessibility Action:** Ensure passenger dignity, provide standard transit seat replacement if required, and check that nearby ramps are clear.";
    }

    if (scenario === 'rain') {
      specialWarning = "\n*   **Hazard Warning:** Wet weather operations active. Walkways are slick. Crews must wear high-visibility rain gear.";
    } else if (scenario === 'overcrowd') {
      specialWarning = "\n*   **Hazard Warning:** Severe crowd congestion in surrounding zone. Team should proceed via designated staff tunnels to bypass crowds.";
    }

    const planText = `### GenAI Operational Dispatch Briefing
*   **Assigned Unit:** ${crew}
*   **Priority Dispatch Level:** ${priorityCode}
*   **Target Location:** ${sanitizedLocation}
*   **Target Response ETA:** ${eta}

#### Tactical Action Steps:
1. Deploy ${crew} immediately.
2. Secure the perimeter to prevent secondary incidents.
3. Resolve the primary issue ("${sanitizedTitle}").
4. Signal back to command post when clear.${accessibilityBrief}${specialWarning}`;

    return NextResponse.json({ plan: planText });
  } catch (error) {
    console.error("Dispatch API error:", error);
    return NextResponse.json({ error: "Failed to generate plan." }, { status: 500 });
  }
}

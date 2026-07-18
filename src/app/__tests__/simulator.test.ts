import { getAIConciergeReply, SCENARIOS, INITIAL_INCIDENTS } from '../simulatorData';

describe('FIFA 2026 Simulator State & Logic tests', () => {
  
  test('initial incidents are defined and have high-quality fields', () => {
    expect(INITIAL_INCIDENTS.length).toBeGreaterThan(0);
    const incident = INITIAL_INCIDENTS[0];
    expect(incident).toHaveProperty('id');
    expect(incident).toHaveProperty('title');
    expect(incident).toHaveProperty('location');
    expect(incident).toHaveProperty('priority');
    expect(incident).toHaveProperty('aiRecommendation');
  });

  test('scenarios (normal, rain, overcrowd, vip) are properly loaded', () => {
    expect(SCENARIOS).toHaveProperty('normal');
    expect(SCENARIOS).toHaveProperty('rain');
    expect(SCENARIOS).toHaveProperty('overcrowd');
    expect(SCENARIOS).toHaveProperty('vip');

    expect(SCENARIOS.rain.transitList.some(t => t.status === 'delayed')).toBe(true);
    expect(SCENARIOS.overcrowd.impactMetrics.crowdIndex).toBeGreaterThan(90);
  });

  test('AI Concierge handles basic queries correctly', () => {
    // Test greetings
    const hiReply = getAIConciergeReply('hello there', 'normal');
    expect(hiReply).toContain('FIFA 2026 Arena Concierge');

    // Test accessibility
    const accessibilityReply = getAIConciergeReply('where is the elevator or wheelchair ramp?', 'normal');
    expect(accessibilityReply).toContain('ADA');

    // Test concessions
    const foodReply = getAIConciergeReply('is there any food near me?', 'normal');
    expect(foodReply).toContain('Concessions');
  });

  test('AI Concierge adapts to rain scenario', () => {
    const rainReply = getAIConciergeReply('how are the trains running?', 'rain');
    expect(rainReply).toContain('delay');
    expect(rainReply).toContain('rain');
  });

  test('AI Concierge adapts to gate overcrowding scenario', () => {
    const overcrowdReply = getAIConciergeReply('is gate c open?', 'overcrowd');
    expect(overcrowdReply).toContain('Gate C');
    expect(overcrowdReply).toContain('Gate C Warning');
  });
});

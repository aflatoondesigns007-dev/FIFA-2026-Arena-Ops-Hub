/**
 * @jest-environment node
 */

import { POST as chatPOST } from '../api/chat/route';
import { POST as dispatchPOST } from '../api/dispatch/route';

describe('POST /api/chat route tests', () => {
  test('returns HTTP 400 on empty message body', async () => {
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ scenario: 'normal' })
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
    const text = await res.text();
    expect(text).toBe('Invalid message format.');
  });

  test('returns HTTP 400 on non-string message parameters', async () => {
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 12345, scenario: 'normal' })
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
  });

  test('successfully responds to valid message inquiries', async () => {
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'Where is my gate?', scenario: 'normal', lang: 'en' })
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();

    // Drain the readable stream completely so that background timers can finish and close
    const reader = res.body!.getReader();
    let done = false;
    while (!done) {
      const { done: doneReading } = await reader.read();
      done = doneReading;
    }
  });
});

describe('POST /api/dispatch route tests', () => {
  test('returns HTTP 400 on missing incident parameters', async () => {
    const req = new Request('http://localhost:3000/api/dispatch', {
      method: 'POST',
      body: JSON.stringify({ scenario: 'normal' })
    });
    const res = await dispatchPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Invalid incident data');
  });

  test('returns HTTP 400 on incomplete incident fields', async () => {
    const req = new Request('http://localhost:3000/api/dispatch', {
      method: 'POST',
      body: JSON.stringify({ 
        incident: { title: 'Liquid Spill' }, // missing location and priority
        scenario: 'normal' 
      })
    });
    const res = await dispatchPOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Missing required incident fields');
  });

  test('successfully compiles tactical briefs for valid incidents', async () => {
    const req = new Request('http://localhost:3000/api/dispatch', {
      method: 'POST',
      body: JSON.stringify({
        incident: {
          title: 'Liquid Spill near Concession B4',
          location: 'Section 114',
          priority: 'medium'
        },
        scenario: 'normal'
      })
    });
    const res = await dispatchPOST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.plan).toContain('GenAI Operational Dispatch Briefing');
    expect(data.plan).toContain('Section 114');
  });
});

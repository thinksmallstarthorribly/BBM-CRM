// netlify/functions/checklist-responses.js
// Returns all stored checklist submissions for the CRM Checklist Responses view.

const { getStore } = require('@netlify/blobs');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const store = getStore({ name: 'checklist', consistency: 'strong' });
    let responses = [];
    try {
      const existing = await store.get('responses', { type: 'json' });
      if (Array.isArray(existing)) responses = existing;
    } catch { /* no submissions yet */ }

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify(responses)
    };
  } catch (e) {
    console.error('Blob read error:', e.message);
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Could not retrieve responses' }) };
  }
};

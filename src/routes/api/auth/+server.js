import { json } from '@sveltejs/kit';

const API_BASE = 'http://170.64.143.1:8000';

export async function POST({ request, url }) {
  const endpoint = url.searchParams.get('endpoint') || 'login';
  const body = await request.json();
  
  try {
    const response = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(body.token && { 'Authorization': `Bearer ${body.token}` })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    
    return json(data, { 
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error) {
    return json(
      { message: 'Network error' }, 
      { status: 500 }
    );
  }
}

export async function GET({ request, url }) {
  const endpoint = url.searchParams.get('endpoint') || 'me';
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return json({ message: 'Token required' }, { status: 401 });
  }

  try {
    const response = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    
    return json(data, { 
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }
    });
  } catch (error) {
    return json(
      { message: 'Network error' }, 
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
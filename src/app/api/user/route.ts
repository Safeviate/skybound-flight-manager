'use server';

import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';

// In a real application, this should be a secure, per-company key stored in a secure location.
const MOBILE_APP_API_KEY = process.env.MOBILE_APP_API_KEY || "your-secret-api-key-for-mobile";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const apiKey = request.headers.get('x-api-key');
  
  if (apiKey !== MOBILE_APP_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized: Missing or invalid token' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const [companyId, userId] = token.split(':');

  if (!companyId || !userId) {
    return NextResponse.json({ error: 'Invalid token format. Expected "companyId:userId"' }, { status: 400 });
  }

  try {
    const userRef = doc(db, `companies/${companyId}/users`, userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userSnap.data() as User;
    // It's crucial to remove sensitive information before sending it to the client.
    const { password, ...userToSend } = userData;

    return NextResponse.json(userToSend);

  } catch (error) {
    console.error('API Error fetching user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
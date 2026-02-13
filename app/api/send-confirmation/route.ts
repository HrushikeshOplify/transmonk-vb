import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmail, sendInternalNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, organization } = body;

    // Validate required fields
    if (!name || !email || !phone || !organization) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    console.log('📧 Sending confirmation email to:', email);

    // Send confirmation email to customer
    await sendConfirmationEmail({
      name,
      email,
      phone,
      organization,
    });

    // Optional: Send internal notification to your team
    try {
      await sendInternalNotification({
        name,
        email,
        phone,
        organization,
      });
    } catch (error) {
      console.error('⚠️ Failed to send internal notification:', error);
      // Don't fail the request if internal email fails
    }

    // Optional: Save to database
    // await saveToDatabase({ name, email, phone, organization });

    return NextResponse.json({
      success: true,
      message: 'Confirmation email sent successfully',
    });

  } catch (error: any) {
    console.error('❌ Error sending confirmation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send confirmation email' },
      { status: 500 }
    );
  }
}
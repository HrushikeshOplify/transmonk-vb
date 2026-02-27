import { NextRequest, NextResponse } from 'next/server';
import { sendConfirmationEmail, sendInternalNotification } from '@/lib/email';

const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/4yprochn78lmf4i3v4lxgkaha5ui7l6b';

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

    // Send data to Make webhook
    try {
      const webhookResponse = await fetch(MAKE_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitor_name: name,
          phone_number: phone,
          email_address: email,
          organization: organization,
        }),
      });

      if (!webhookResponse.ok) {
        console.error('⚠️ Make webhook responded with status:', webhookResponse.status);
      } else {
        console.log('✅ Data sent to Make webhook successfully');
      }
    } catch (error) {
      console.error('⚠️ Failed to send data to Make webhook:', error);
      // Don't fail the request if webhook call fails
    }

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
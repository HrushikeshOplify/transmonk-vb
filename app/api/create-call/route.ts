

import { NextRequest, NextResponse } from 'next/server';

const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
const ULTRAVOX_AGENT_ID = process.env.ULTRAVOX_AGENT_ID;

export async function POST(request: NextRequest) {
  try {
    // Validate
    if (!ULTRAVOX_API_KEY || !ULTRAVOX_AGENT_ID) {
      return NextResponse.json(
        { error: 'Missing API key or Agent ID' },
        { status: 500 }
      );
    }

    console.log('📞 Creating call with agent:', ULTRAVOX_AGENT_ID);

    // Create call
    const response = await fetch(
      `https://api.ultravox.ai/api/agents/${ULTRAVOX_AGENT_ID}/calls`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ULTRAVOX_API_KEY,
        },
        body: JSON.stringify({}), // Use agent defaults
      }
    );

    // Handle errors
    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create call' },
        { status: response.status }
      );
    }

    // Return success
    const callData = await response.json();
    console.log('✅ Call created:', callData.callId);

    return NextResponse.json({
      success: true,
      callId: callData.callId,
      joinUrl: callData.joinUrl,
    });

  } catch (error: any) {
    console.error('❌ Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}






















// import { NextRequest, NextResponse } from 'next/server';

// const ULTRAVOX_API_KEY = process.env.ULTRAVOX_API_KEY;
// const CORPUS_ID = process.env.CORPUS_ID;
// const ULTRAVOX_AGENT_ID = process.env.ULTRAVOX_AGENT_ID;

// export async function POST(request: NextRequest) {
//   try {
//     // Validate environment variables
//     if (!ULTRAVOX_API_KEY) {
//       return NextResponse.json(
//         { error: 'ULTRAVOX_API_KEY not configured' },
//         { status: 500 }
//       );
//     }

//     if (!CORPUS_ID) {
//       return NextResponse.json(
//         { error: 'CORPUS_ID not configured' },
//         { status: 500 }
//       );
//     }

//     const body = await request.json();
//    // const { voice = 'terrence', model = 'fixie-ai/ultravox', customPrompt } = body;

//     console.log('📞 Creating Ultravox call...');

//     // Create call with Ultravox API
//     const response = await fetch(`https://api.ultravox.ai/api/agents/${ULTRAVOX_AGENT_ID}/calls`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'X-API-Key': ULTRAVOX_API_KEY,
//       },
//       body: JSON.stringify({
//         // systemPrompt: customPrompt || SYSTEM_PROMPT,
//         // model: model,
//         // voice: voice,
//         selectedTools: [
//           {
//             toolName: 'queryCorpus',
//             parameterOverrides: {
//               corpus_id: CORPUS_ID,
//               max_results: 5,
//             },
//           },
//         ],
//       }),
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       console.error('❌ Ultravox API error:', error);
//       return NextResponse.json(
//         { error: error.message || 'Failed to create call' },
//         { status: response.status }
//       );
//     }

//     const callData = await response.json();
//     console.log('✅ Call created:', callData.callId);

//     return NextResponse.json({
//       success: true,
//       callId: callData.callId,
//       joinUrl: callData.joinUrl,
//     });
//   } catch (error: any) {
//     console.error('❌ Error in create-call API:', error);
//     return NextResponse.json(
//       { error: error.message || 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

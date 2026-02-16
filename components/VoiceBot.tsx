'use client';

import { useState, useRef, useEffect } from 'react';
import { UltravoxSession, UltravoxSessionStatus, Transcript } from 'ultravox-client';

type CallState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing';

interface UserInfo {
  name: string;
  phone: string;
  email: string;
  organization: string;
}

export default function VoiceBot() {
  // State
  const [callState, setCallState] = useState<CallState>('idle');
  const [statusMessage, setStatusMessage] = useState('Click the microphone to start');
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [stats, setStats] = useState({ exchanges: 0, ragQueries: 0 });
  
  // New: Form modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo>({
    name: '',
    phone: '',
    email: '',
    organization: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Refs
  const sessionRef = useRef<UltravoxSession | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const isActive = callState !== 'idle';

  // Initialize Ultravox session on mount
  useEffect(() => {
    sessionRef.current = new UltravoxSession();

    // 1. Define handleStatusChange properly as a function
    const handleStatusChange = () => {
      const status = sessionRef.current?.status;
      console.log('Status changed:', status);

      switch (status) {
        case UltravoxSessionStatus.DISCONNECTED:
          updateState('idle', 'Click the microphone to start');
          cleanup();
          break;
        case UltravoxSessionStatus.CONNECTING:
          updateState('connecting', 'Connecting to voice assistant...');
          break;
        case UltravoxSessionStatus.IDLE: 
          updateState('listening', 'Ready! Start speaking...');
          break;
        case UltravoxSessionStatus.LISTENING:
          updateState('listening', 'Listening... Speak now');
          break;
        case UltravoxSessionStatus.THINKING:
          updateState('processing', 'Processing your request...');
          break;
        case UltravoxSessionStatus.SPEAKING:
          updateState('speaking', 'AI is responding...');
          break;
      }
    };

    // 2. Transcripts listener
    const handleTranscripts = () => {
      const currentTranscripts = sessionRef.current?.transcripts || [];
      setTranscripts(currentTranscripts);

      const userCount = currentTranscripts.filter(t => t.speaker === 'user').length;
      setStats(prev => ({ ...prev, exchanges: userCount }));
    };

    // 3. Add the listeners
    sessionRef.current.addEventListener('status', handleStatusChange);
    sessionRef.current.addEventListener('transcripts', handleTranscripts);

    return () => {
      if (sessionRef.current) {
        sessionRef.current.removeEventListener('status', handleStatusChange);
        sessionRef.current.removeEventListener('transcripts', handleTranscripts);
        sessionRef.current.leaveCall();
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Extract user information from conversation
  const extractUserInfo = (transcripts: Transcript[]) => {
    const userMessages = transcripts
      .filter(t => t.speaker === 'user')
      .map(t => t.text)
      .join(' ');

    const agentMessages = transcripts
      .filter(t => t.speaker === 'agent')
      .map(t => t.text)
      .join(' ');

    const allText = userMessages + ' ' + agentMessages;

    console.log('📝 Extracting from conversation:', allText);

    // Enhanced extraction patterns
    const nameMatch = allText.match(/(?:name is|i'm|i am|my name's|call me|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    const emailMatch = allText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
    const phoneMatch = allText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    const orgMatch = allText.match(/(?:company|organization|work at|from|with|represent)\s+([A-Z][a-zA-Z\s&.,]+?)(?:\.|,|\sand\s|$)/i);

    const extractedInfo: UserInfo = {
      name: nameMatch ? nameMatch[1].trim() : '',
      email: emailMatch ? emailMatch[1].trim() : '',
      phone: phoneMatch ? phoneMatch[0].trim() : '',
      organization: orgMatch ? orgMatch[1].trim() : '',
    };

    console.log('✅ Extracted info:', extractedInfo);
    
    // Update the form state with extracted values
    setUserInfo(extractedInfo);
  };

  const updateState = (state: CallState, message: string) => {
    setCallState(state);
    setStatusMessage(message);
  };

  const startDurationTimer = () => {
    startTimeRef.current = Date.now();
    durationIntervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setCallDuration(elapsed);
      }
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const handleToggleCall = async () => {
    if (isActive) {
      // Extract information from conversation before ending
      if (transcripts.length > 0) {
        extractUserInfo(transcripts);
      }
      
      // End the call
      await endCall();
      
      // Show the form modal
      setShowFormModal(true);
    } else {
      await startCall();
    }
  };

  const startCall = async () => {
    try {
      setError(null);
      updateState('connecting', 'Connecting to voice assistant...');

      const response = await fetch('/api/create-call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create call');
      }

      const data = await response.json();
      console.log('✅ Call created:', data.callId);

      if (sessionRef.current) {
        await sessionRef.current.joinCall(data.joinUrl);
        console.log('✅ Joined call successfully');
        startDurationTimer();
      }
    } catch (err: any) {
      console.error('Error starting call:', err);
      setError(err.message);
      updateState('idle', 'Click the microphone to start');
    }
  };

  const endCall = async () => {
    if (sessionRef.current) {
      await sessionRef.current.leaveCall();
      console.log('✅ Left call');
    }
    cleanup();
  };

  const cleanup = () => {
    stopDurationTimer();
    setCallDuration(0);
    setTranscripts([]);
    setStats({ exchanges: 0, ragQueries: 0 });
    // DON'T reset userInfo here - we need it for the form modal
  };

  // Handle form input changes
  const handleInputChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
  };

  // Handle form cancellation
  const handleFormCancel = () => {
    setShowFormModal(false);
    setUserInfo({ name: '', phone: '', email: '', organization: '' });
    setError(null);
  };

  // Handle form submission
  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userInfo),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send confirmation');
      }

      const result = await response.json();
      console.log('✅ Confirmation sent:', result);

      setSubmitSuccess(true);
      
      // Close modal and reset after 2 seconds
      setTimeout(() => {
        setShowFormModal(false);
        setSubmitSuccess(false);
        setUserInfo({ name: '', phone: '', email: '', organization: '' });
      }, 2000);

    } catch (err: any) {
      console.error('Error sending confirmation:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusDotColor = () => {
    switch (callState) {
      case 'idle':
        return 'bg-green-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'listening':
        return 'bg-blue-500 animate-pulse';
      case 'speaking':
        return 'bg-purple-500 animate-pulse';
      case 'processing':
        return 'bg-cyan-500 animate-pulse';
      default:
        return 'bg-gray-500';
    }
  };

  const getButtonIcon = () => {
    switch (callState) {
      case 'connecting':
        return '⏳';
      case 'listening':
        return '🎤';
      case 'speaking':
        return '🔊';
      case 'processing':
        return '🔍';
      default:
        return '🎤';
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              🎙️ Transmonk Voice Assistant
            </h1>
            <p className="text-gray-600 text-lg">
              Ask me anything about HVAC systems
            </p>
          </div>

          {/* Error Banner */}
          {error && !showFormModal && (
            <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="text-red-800 font-semibold text-sm">⚠️ Error</div>
              <div className="text-red-600 text-sm mt-1">{error}</div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⏱️</div>
              <div className="text-xs text-gray-600 mb-1">Duration</div>
              <div className="text-xl font-bold text-gray-800">
                {formatDuration(callDuration)}
              </div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">💬</div>
              <div className="text-xs text-gray-600 mb-1">Exchanges</div>
              <div className="text-xl font-bold text-gray-800">{stats.exchanges}</div>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">🔍</div>
              <div className="text-xs text-gray-600 mb-1">Status</div>
              <div className="text-sm font-bold text-gray-800">{callState}</div>
            </div>
          </div>

          {/* Voice Button */}
          <div className="flex flex-col items-center mb-8">
            <button
              onClick={handleToggleCall}
              disabled={callState === 'connecting'}
              className={`
                w-36 h-36 rounded-full flex items-center justify-center
                text-6xl transition-all duration-300 shadow-xl
                ${
                  isActive
                    ? 'bg-gradient-to-br from-pink-400 to-red-400 hover:from-pink-500 hover:to-red-500 animate-pulse-slow'
                    : callState === 'connecting' as string
                    ? 'bg-gray-400 cursor-not-allowed opacity-60'
                    : 'bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 hover:scale-110'
                }
                disabled:hover:scale-100
                relative
              `}
            >
              {isActive && (
                <div className="absolute inset-0 rounded-full border-2 border-white opacity-60 animate-ripple" />
              )}
              <span className="relative z-10">{getButtonIcon()}</span>
            </button>
            <div className="mt-4 text-sm text-gray-600 font-medium">
              {isActive ? 'Click to end conversation' : 'Click to start conversation'}
            </div>
          </div>

          {/* Status Card */}
          <div
            className={`
            rounded-2xl p-6 mb-6 border-2 transition-all
            ${
              isActive
                ? 'bg-indigo-50 border-indigo-200'
                : 'bg-gray-50 border-gray-200'
            }
          `}
          >
            <div className="flex items-center mb-4">
              <div className={`w-3 h-3 rounded-full mr-3 ${getStatusDotColor()}`} />
              <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {callState}
              </div>
            </div>
            <div className="text-gray-600">{statusMessage}</div>

            {/* Transcripts */}
            {transcripts.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                {transcripts.map((transcript, index) => (
                  <div
                    key={index}
                    className={`
                      p-3 rounded-lg text-sm border-l-4
                      ${
                        transcript.speaker === 'user'
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-purple-50 border-purple-500'
                      }
                    `}
                  >
                    <div
                      className={`
                        text-xs font-semibold mb-1 uppercase tracking-wide
                        ${transcript.speaker === 'user' ? 'text-blue-700' : 'text-purple-700'}
                      `}
                    >
                      {transcript.speaker === 'user' ? '👤 You' : '🤖 Assistant'}
                    </div>
                    <div className="text-gray-700">{transcript.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-5">
            <div className="text-sm font-semibold text-green-800 mb-3">How to use:</div>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-start">
                <span className="mr-2 font-bold">✓</span>
                <span>Click the microphone to start a conversation</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-bold">✓</span>
                <span>Speak naturally about HVAC systems and products</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-bold">✓</span>
                <span>Provide your details when asked</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2 font-bold">✓</span>
                <span>Review and confirm your information</span>
              </li>
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            Works best in Chrome, Edge, or Safari • Requires microphone access
          </div>
        </div>
      </div>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-slideUp">
            {submitSuccess ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold text-green-600 mb-2">
                  Success!
                </h3>
                <p className="text-gray-600">
                  Your confirmation email has been sent.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Confirm Your Information
                </h2>
                <p className="text-gray-600 text-sm mb-6">
                  Please review and edit your details if needed
                </p>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                     // value={userInfo.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full text-gray-600 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={userInfo.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full text-gray-600 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={userInfo.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full text-gray-600 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                  </div>

                  {/* Organization */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Organization *
                    </label>
                    <input
                      type="text"
                     // value={userInfo.organization}
                      onChange={(e) => handleInputChange('organization', e.target.value)}
                      className="w-full text-gray-600 px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition"
                      placeholder="Company Name"
                      required
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={handleFormCancel}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    disabled={isSubmitting || !userInfo.name || !userInfo.email}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Sending...' : 'Confirm & Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}













// 'use client';

// import { useState, useRef, useEffect } from 'react';
// import { UltravoxSession, UltravoxSessionStatus, Transcript } from 'ultravox-client';

// type CallState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'processing';

// export default function VoiceBot() {
//   // State
//   const [callState, setCallState] = useState<CallState>('idle');
//   const [statusMessage, setStatusMessage] = useState('Click the microphone to start');
//   const [transcripts, setTranscripts] = useState<Transcript[]>([]);
//   const [error, setError] = useState<string | null>(null);
//   const [callDuration, setCallDuration] = useState(0);
//   const [stats, setStats] = useState({ exchanges: 0, ragQueries: 0 });

//   // Refs
//   const sessionRef = useRef<UltravoxSession | null>(null);
//   const startTimeRef = useRef<number | null>(null);
//   const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

//   const isActive = callState !== 'idle';

//   // Initialize Ultravox session on mount
//   useEffect(() => {
//     sessionRef.current = new UltravoxSession();

//     // Status change listener
//     const handleStatusChange = () => {
//       const status = sessionRef.current?.status;
//       console.log('Status changed:', status);

//       switch (status) {
//         case UltravoxSessionStatus.IDLE:
//           updateState('idle', 'Click the microphone to start');
//           cleanup();
//           break;
//         case UltravoxSessionStatus.CONNECTING:
//           updateState('connecting', 'Connecting to voice assistant...');
//           break;
//         case UltravoxSessionStatus.IDLE_READY:
//           updateState('listening', 'Ready! Start speaking...');
//           break;
//         case UltravoxSessionStatus.LISTENING:
//           updateState('listening', 'Listening... Speak now');
//           break;
//         case UltravoxSessionStatus.THINKING:
//           updateState('processing', 'Processing your request...');
//           break;
//         case UltravoxSessionStatus.SPEAKING:
//           updateState('speaking', 'AI is responding...');
//           break;
//       }
//     };

//     // Transcripts listener
//     const handleTranscripts = () => {
//       const currentTranscripts = sessionRef.current?.transcripts || [];
//       setTranscripts(currentTranscripts);

//       // Count user exchanges
//       const userCount = currentTranscripts.filter(t => t.speaker === 'user').length;
//       setStats(prev => ({ ...prev, exchanges: userCount }));
//     };

//     sessionRef.current.addEventListener('status', handleStatusChange);
//     sessionRef.current.addEventListener('transcripts', handleTranscripts);

//     return () => {
//       if (sessionRef.current) {
//         sessionRef.current.removeEventListener('status', handleStatusChange);
//         sessionRef.current.removeEventListener('transcripts', handleTranscripts);
//         sessionRef.current.leaveCall();
//       }
//       if (durationIntervalRef.current) {
//         clearInterval(durationIntervalRef.current);
//       }
//     };
//   }, []);

//   const updateState = (state: CallState, message: string) => {
//     setCallState(state);
//     setStatusMessage(message);
//   };

//   const startDurationTimer = () => {
//     startTimeRef.current = Date.now();
//     durationIntervalRef.current = setInterval(() => {
//       if (startTimeRef.current) {
//         const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
//         setCallDuration(elapsed);
//       }
//     }, 1000);
//   };

//   const stopDurationTimer = () => {
//     if (durationIntervalRef.current) {
//       clearInterval(durationIntervalRef.current);
//       durationIntervalRef.current = null;
//     }
//   };

//   const handleToggleCall = async () => {
//     if (isActive) {
//       await endCall();
//     } else {
//       await startCall();
//     }
//   };

//   const startCall = async () => {
//     try {
//       setError(null);
//       updateState('connecting', 'Connecting to voice assistant...');

//       // Call our Next.js API route to create the call
//       const response = await fetch('/api/create-call', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           voice: 'terrence',
//           model: 'fixie-ai/ultravox',
//         }),
//       });

//       if (!response.ok) {
//         const error = await response.json();
//         throw new Error(error.error || 'Failed to create call');
//       }

//       const data = await response.json();
//       console.log('✅ Call created:', data.callId);

//       // Join the call using Ultravox SDK
//       if (sessionRef.current) {
//         await sessionRef.current.joinCall(data.joinUrl);
//         console.log('✅ Joined call successfully');
//         startDurationTimer();
//       }
//     } catch (err: any) {
//       console.error('Error starting call:', err);
//       setError(err.message);
//       updateState('idle', 'Click the microphone to start');
//     }
//   };

//   const endCall = async () => {
//     if (sessionRef.current) {
//       await sessionRef.current.leaveCall();
//       console.log('✅ Left call');
//     }
//     cleanup();
//   };

//   const cleanup = () => {
//     stopDurationTimer();
//     setCallDuration(0);
//     setTranscripts([]);
//     setStats({ exchanges: 0, ragQueries: 0 });
//   };

//   const formatDuration = (seconds: number) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = seconds % 60;
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   const getStatusDotColor = () => {
//     switch (callState) {
//       case 'idle':
//         return 'bg-green-500';
//       case 'connecting':
//         return 'bg-yellow-500 animate-pulse';
//       case 'listening':
//         return 'bg-blue-500 animate-pulse';
//       case 'speaking':
//         return 'bg-purple-500 animate-pulse';
//       case 'processing':
//         return 'bg-cyan-500 animate-pulse';
//       default:
//         return 'bg-gray-500';
//     }
//   };

//   const getButtonIcon = () => {
//     switch (callState) {
//       case 'connecting':
//         return '⏳';
//       case 'listening':
//         return '🎤';
//       case 'speaking':
//         return '🔊';
//       case 'processing':
//         return '🔍';
//       default:
//         return '🎤';
//     }
//   };

//   return (
//     <div className="flex items-center justify-center min-h-screen p-4">
//       <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 max-w-2xl w-full">
//         {/* Header */}
//         <div className="text-center mb-10">
//           <h1 className="text-4xl font-bold text-gray-800 mb-3">
//             🎙️ HVAC Voice Assistant
//           </h1>
//           <p className="text-gray-600 text-lg">
//             Ask me anything about HVAC systems
//           </p>
//           <span className="inline-block mt-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
//             Powered by Ultravox AI
//           </span>
//         </div>

//         {/* Error Banner */}
//         {error && (
//           <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-xl p-4">
//             <div className="text-red-800 font-semibold text-sm">⚠️ Error</div>
//             <div className="text-red-600 text-sm mt-1">{error}</div>
//           </div>
//         )}

//         {/* Stats Cards */}
//         <div className="grid grid-cols-3 gap-4 mb-8">
//           <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
//             <div className="text-2xl mb-2">⏱️</div>
//             <div className="text-xs text-gray-600 mb-1">Duration</div>
//             <div className="text-xl font-bold text-gray-800">
//               {formatDuration(callDuration)}
//             </div>
//           </div>
//           <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
//             <div className="text-2xl mb-2">💬</div>
//             <div className="text-xs text-gray-600 mb-1">Exchanges</div>
//             <div className="text-xl font-bold text-gray-800">{stats.exchanges}</div>
//           </div>
//           <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-4 text-center">
//             <div className="text-2xl mb-2">🔍</div>
//             <div className="text-xs text-gray-600 mb-1">Status</div>
//             <div className="text-sm font-bold text-gray-800">{callState}</div>
//           </div>
//         </div>

//         {/* Voice Button */}
//         <div className="flex flex-col items-center mb-8">
//           <button
//             onClick={handleToggleCall}
//             disabled={callState === 'connecting'}
//             className={`
//               w-36 h-36 rounded-full flex items-center justify-center
//               text-6xl transition-all duration-300 shadow-xl
//               ${
//                 isActive
//                   ? 'bg-gradient-to-br from-pink-400 to-red-400 hover:from-pink-500 hover:to-red-500 animate-pulse-slow'
//                   : callState === 'connecting'
//                   ? 'bg-gray-400 cursor-not-allowed opacity-60'
//                   : 'bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 hover:scale-110'
//               }
//               disabled:hover:scale-100
//               relative
//             `}
//           >
//             {isActive && (
//               <div className="absolute inset-0 rounded-full border-2 border-white opacity-60 animate-ripple" />
//             )}
//             <span className="relative z-10">{getButtonIcon()}</span>
//           </button>
//           <div className="mt-4 text-sm text-gray-600 font-medium">
//             {isActive ? 'Click to end conversation' : 'Click to start conversation'}
//           </div>
//         </div>

//         {/* Status Card */}
//         <div
//           className={`
//           rounded-2xl p-6 mb-6 border-2 transition-all
//           ${
//             isActive
//               ? 'bg-indigo-50 border-indigo-200'
//               : 'bg-gray-50 border-gray-200'
//           }
//         `}
//         >
//           <div className="flex items-center mb-4">
//             <div className={`w-3 h-3 rounded-full mr-3 ${getStatusDotColor()}`} />
//             <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
//               {callState}
//             </div>
//           </div>
//           <div className="text-gray-600">{statusMessage}</div>

//           {/* Transcripts */}
//           {transcripts.length > 0 && (
//             <div className="mt-4 max-h-48 overflow-y-auto custom-scrollbar space-y-2">
//               {transcripts.map((transcript, index) => (
//                 <div
//                   key={index}
//                   className={`
//                     p-3 rounded-lg text-sm border-l-4
//                     ${
//                       transcript.speaker === 'user'
//                         ? 'bg-blue-50 border-blue-500'
//                         : 'bg-purple-50 border-purple-500'
//                     }
//                   `}
//                 >
//                   <div
//                     className={`
//                       text-xs font-semibold mb-1 uppercase tracking-wide
//                       ${transcript.speaker === 'user' ? 'text-blue-700' : 'text-purple-700'}
//                     `}
//                   >
//                     {transcript.speaker === 'user' ? '👤 You' : '🤖 Assistant'}
//                   </div>
//                   <div className="text-gray-700">{transcript.text}</div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>

//         {/* Instructions */}
//         <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-5">
//           <div className="text-sm font-semibold text-green-800 mb-3">How to use:</div>
//           <ul className="space-y-2 text-sm text-green-700">
//             <li className="flex items-start">
//               <span className="mr-2 font-bold">✓</span>
//               <span>Click the microphone to start a conversation</span>
//             </li>
//             <li className="flex items-start">
//               <span className="mr-2 font-bold">✓</span>
//               <span>Speak naturally about HVAC systems and products</span>
//             </li>
//             <li className="flex items-start">
//               <span className="mr-2 font-bold">✓</span>
//               <span>The AI will search our knowledge base and respond</span>
//             </li>
//             <li className="flex items-start">
//               <span className="mr-2 font-bold">✓</span>
//               <span>Click again to end the conversation</span>
//             </li>
//           </ul>
//         </div>

       
//       </div>
//     </div>
//   );
// }

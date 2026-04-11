import { supabase } from './supabaseClient';

export async function* getMedicalAssistanceStream(prompt: string) {
  try {
    if (!prompt || prompt.trim() === '') {
      yield 'Please enter a drug name or question.';
      return;
    }

    if (!supabase) {
      console.error('Supabase client not initialized');
      yield 'Service not available. Please contact your administrator.';
      return;
    }

    // Get the current session token
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      yield 'Please log in to use the AI Consult feature.';
      return;
    }

    console.log('🚀 Calling AI Consult Edge Function...');
    console.log('📝 Query:', prompt.trim());
    console.log('🔑 Session exists:', !!session);
    console.log('👤 User:', session.user?.email);
    console.log('🎫 Access token exists:', !!session.access_token);
    
    // Call the Supabase Edge Function with proper authorization
    const startTime = Date.now();
    const { data, error } = await supabase.functions.invoke('ai-consult', {
      body: { query: prompt.trim() },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });
    const duration = Date.now() - startTime;

    console.log(`⏱️ Request took ${duration}ms`);
    console.log('📦 Response data:', data);
    console.log('❌ Response error:', error);

    if (error) {
      console.error('🔴 Edge Function Error:', error);
      console.error('🔴 Error type:', error.name);
      console.error('🔴 Error message:', error.message);
      console.error('🔴 Error details:', JSON.stringify(error, null, 2));
      
      // Check if it's a FunctionsHttpError with context
      if (error.context) {
        console.error('🔴 Error context:', error.context);
      }
      
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        yield 'AI Consult service is not deployed. Please run: supabase functions deploy ai-consult';
      } else if (error.message?.includes('unauthorized') || error.message?.includes('401')) {
        yield 'Authentication error. Please log in again.';
      } else if (error.message?.includes('FunctionsRelayError') || error.message?.includes('FunctionsHttpError')) {
        yield `Edge function error (${error.message}). Check browser console for details. The function may be returning an error status code.`;
      } else {
        yield `Error: ${error.message || 'Unable to process request'}. Check console for details.`;
      }
      return;
    }

    if (data?.error) {
      console.error('🔴 API Error:', data.error);
      if (data.hint) {
        console.error('💡 Hint:', data.hint);
      }
      if (data.details) {
        console.error('📋 Details:', data.details);
      }
      yield `Error: ${data.error}`;
      if (data.hint) {
        yield `\n\n💡 ${data.hint}`;
      }
      return;
    }

    // Stream the response character by character for smooth UI experience
    const responseText = data?.response || 'No response received';
    console.log('✅ Got response, length:', responseText.length);
    
    const words = responseText.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      yield words[i] + (i < words.length - 1 ? ' ' : '');
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 30));
    }

    console.log('✅ Stream completed successfully');
  } catch (error: any) {
    console.error("🔴 Medical Assistance Error:", error);
    console.error("🔴 Error stack:", error.stack);
    
    if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
      yield 'Network error. Please check your connection and try again.';
    } else {
      yield `Error: ${error?.message || 'Unknown error occurred'}. Please try again.`;
    }
  }
}

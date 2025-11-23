// Test diretto dell'API OpenRouter
import { API_CONFIG, MODEL_MAPPING } from './src/config/api.js';

async function testOpenRouterAPI() {
  console.log('🔍 Test API OpenRouter...\n');
  
  const testMessage = 'Ciao! Funziona?';
  const apiModel = MODEL_MAPPING['nebula-5.1-instant'];
  
  console.log('📋 Configurazione:');
  console.log('   Base URL:', API_CONFIG.baseURL);
  console.log('   Model:', apiModel);
  console.log('   API Key:', API_CONFIG.apiKey.substring(0, 20) + '...');
  console.log('   Message:', testMessage);
  console.log('\n');
  
  try {
    const requestBody = {
      model: apiModel,
      messages: [
        {
          role: 'system',
          content: 'Sei Nebula AI, un assistente AI utile, amichevole e professionale. Rispondi sempre in italiano.'
        },
        {
          role: 'user',
          content: testMessage
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    };
    
    console.log('📤 Invio richiesta...\n');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.apiKey}`,
      'HTTP-Referer': 'http://localhost:5173',
      'X-Title': 'Nebula AI Test'
    };
    
    const response = await fetch(`${API_CONFIG.baseURL}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 Risposta ricevuta:');
    console.log('   Status:', response.status, response.statusText);
    console.log('   Headers:', Object.fromEntries(response.headers.entries()));
    console.log('\n');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Errore API:');
      console.error('   Status:', response.status);
      console.error('   Risposta:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        console.error('   Errore parsato:', JSON.stringify(errorData, null, 2));
      } catch (e) {
        console.error('   (Non è JSON valido)');
      }
      
      return false;
    }
    
    const data = await response.json();
    console.log('✅ Risposta JSON:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      console.log('💬 Risposta AI:');
      console.log('   ' + data.choices[0].message.content);
      console.log('\n');
      console.log('✅ Test completato con successo!');
      return true;
    } else {
      console.error('❌ Nessuna risposta valida nei dati');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Errore durante il test:');
    console.error('   Tipo:', error.name);
    console.error('   Messaggio:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

// Esegui il test
testOpenRouterAPI().then(success => {
  process.exit(success ? 0 : 1);
});


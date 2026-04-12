import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';

interface Message {
  id: string;
  sender_wallet: string;
  message: string;
  file_url?: string;
  file_name?: string;
  created_at: string;
}

interface VaultChatProps {
  contractId: string;
  currentUserWallet: string;
}

export const VaultChat = ({ contractId, currentUserWallet }: VaultChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 📡 1. Cargar mensajes iniciales y suscribirse a nuevos
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('contract_id', contractId)
        .order('created_at', { ascending: true });

      if (data && !error) setMessages(data);
    };

    fetchMessages();

    // El poder del Tiempo Real ⚡
    const subscription = supabase
      .channel(`chat-${contractId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `contract_id=eq.${contractId}` },
        (payload) => {
          setMessages((current) => [...current, payload.new as Message]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [contractId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✉️ 2. Enviar mensaje de texto
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserWallet) return;

    const textToSend = newMessage;
    setNewMessage(''); // Limpiamos el input rápido para buena UX

    await supabase.from('messages').insert([{
      contract_id: contractId,
      sender_wallet: currentUserWallet,
      message: textToSend
    }]);
  };

  // 📎 3. Subir archivo a la Nube Segura
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserWallet) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${contractId}/${fileName}`; // Guardamos en una carpeta con el ID del contrato

      // Subimos a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('vault-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtenemos el link público
      const { data: urlData } = supabase.storage.from('vault-files').getPublicUrl(filePath);

      // Enviamos el mensaje con el link del archivo adjunto
      await supabase.from('messages').insert([{
        contract_id: contractId,
        sender_wallet: currentUserWallet,
        message: '📎 Sent an encrypted attachment.',
        file_url: urlData.publicUrl,
        file_name: file.name
      }]);

    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading file. Make sure it's an allowed format.");
    } finally {
      setIsUploading(false);
    }
  };

  // 🎨 INTERFAZ DEL CHAT (Estilo Premium Dark)
  return (
    <div style={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '15px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '500px', marginTop: '30px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      
      {/* Cabecera del Chat */}
      <div style={{ backgroundColor: '#111', padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💬 Secure Vault Chat
        </h3>
        <span style={{ fontSize: '0.7rem', color: '#888', backgroundColor: '#222', padding: '4px 8px', borderRadius: '6px' }}>
          🔒 E2E Encrypted • Files auto-delete in 7 days
        </span>
      </div>

      {/* Área de Mensajes */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#555', margin: 'auto', fontStyle: 'italic' }}>
            No messages yet. Say hello and finalize your deal details here.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_wallet === currentUserWallet;
            return (
              <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                <span style={{ fontSize: '0.65rem', color: '#666', marginBottom: '4px', display: 'block', textAlign: isMe ? 'right' : 'left' }}>
                  {isMe ? 'You' : msg.sender_wallet.slice(0, 6) + '...'}
                </span>
                
                <div style={{ backgroundColor: isMe ? '#004422' : '#222', color: '#fff', padding: '12px 16px', borderRadius: isMe ? '15px 15px 0 15px' : '15px 15px 15px 0', border: isMe ? '1px solid #2ecc71' : '1px solid #444' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem', wordBreak: 'break-word' }}>{msg.message}</p>
                  
                  {/* Si hay archivo adjunto */}
                  {msg.file_url && (
                    <a href={msg.file_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '10px', padding: '8px 12px', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '8px', textDecoration: 'none', color: '#00ffcc', fontSize: '0.85rem', border: '1px dashed #00ffcc' }}>
                      📥 Download: {msg.file_name}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Envío */}
      <div style={{ backgroundColor: '#111', padding: '15px', borderTop: '1px solid #222' }}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
          
          {/* Botón de Adjuntar Archivo Oculto */}
          <input type="file" id="file-upload" onChange={handleFileUpload} style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg,.zip" />
          <label htmlFor="file-upload" style={{ backgroundColor: '#222', border: '1px solid #444', color: '#FFD700', padding: '0 15px', borderRadius: '10px', display: 'flex', alignItems: 'center', cursor: isUploading ? 'wait' : 'pointer', fontWeight: 'bold' }}>
            {isUploading ? '⌛' : '📎'}
          </label>

          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={!currentUserWallet}
            style={{ flex: 1, backgroundColor: '#000', border: '1px solid #333', color: '#fff', padding: '12px 15px', borderRadius: '10px', outline: 'none' }}
          />
          
          <button type="submit" disabled={!newMessage.trim() || !currentUserWallet} style={{ backgroundColor: '#2ecc71', color: '#000', border: 'none', padding: '0 20px', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
};